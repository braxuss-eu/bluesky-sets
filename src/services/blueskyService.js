import requestService from './requestService';

async function getProfiles(atIdentifiers) {
    const call = 'app.bsky.actor.getProfiles';
    const resKey = 'profiles';
    const result = await requestService.callPartitioned(call, x => ({ actors: x }), atIdentifiers, 25, resKey);
    return result;
}

async function getFollowingSome(atIdentifiers, _atLeast = null, progressCallbackRatio = null) {
    const call = 'app.bsky.graph.getFollowers';
    const resKey = 'followers';
    const profileKey = 'followersCount';
    return getXSome(atIdentifiers, profileKey, call, resKey, _atLeast, progressCallbackRatio);
}

async function getFollowerSome(atIdentifiers, _atLeast = null, progressCallbackRatio = null) {
    const call = 'app.bsky.graph.getFollows';
    const resKey = 'follows';
    const profileKey = 'followsCount';
    return getXSome(atIdentifiers, profileKey, call, resKey, _atLeast, progressCallbackRatio);
}

async function getWhoMeetsCriteria(criteria, progressCallbackRatio = () => { }) {
    const { follow, doesntFollow, follower, notFollower } = criteria;
    const positiveAtIdentifiers = ([...follow?.who || []]).concat([...follower?.who || []]);
    const allAtIdentifiers = ([...follow?.who || []]).concat([...doesntFollow?.who || []]).concat([...follower?.who || []]).concat([...notFollower?.who || []]);
    if (allAtIdentifiers.length > 0 && positiveAtIdentifiers.length == 0) {
        return []; // If this is void intersection
    }
    const allProfiles = await getProfiles(allAtIdentifiers);
    const followPNCount = allProfiles.filter(x => (follow?.who || []).includes(x.handle) || (doesntFollow?.who || []).includes(x.handle)).reduce((sum, item) => sum + item.followersCount, 0);
    const followerPNCount = allProfiles.filter(x => (follower?.who || []).includes(x.handle) || (notFollower?.who || []).includes(x.handle)).reduce((sum, item) => sum + item.followsCount, 0);
    const totalItemCount = followPNCount + followerPNCount;
    /** Accumulated count */
    var accCount = 0;
    var currentAccounts = null;
    /** Accumulated count snapshot at the beginning of a phase */
    var accCountSnapshot = accCount;
    // Phase 1: Get accounts following follow.who
    const phase1Accounts = follow ? await getFollowingSome(follow.who, follow.atLeastHowMany,
        (count) => {
            accCount = accCountSnapshot + count;
            return progressCallbackRatio(accCount, totalItemCount)
        }
    ) : null;
    if (phase1Accounts != null && phase1Accounts.length == 0) { // If it's null then it's ok to continue
        return []; // If this is void intersection is void too
    }
    // Phase 2: Get accounts followed by follower.who
    accCountSnapshot = accCount;
    const phase2Accounts = follower ? await getFollowerSome(follower.who, follower.atLeastHowMany,
        (count) => {
            accCount = accCountSnapshot + count;
            return progressCallbackRatio(accCount, totalItemCount)
        }
    ) : null;
    if (phase2Accounts != null && phase2Accounts.length == 0) { // If it's null then it's ok to continue
        return []; // If this is void intersection is void too
    }
    // Mix phase 1 and phase 2
    if (phase1Accounts != null && phase2Accounts != null) {
        currentAccounts = phase1Accounts.filter(x => phase2Accounts.some(y => x.did === y.did));
    } else {
        currentAccounts = phase1Accounts || phase2Accounts;
    }
    // Negative logic
    if (doesntFollow?.who?.length > 0) {
        accCountSnapshot = accCount;
        // Phase 3: Get accounts following doesntFollow.who
        const phase3Accounts = doesntFollow ? await getFollowingSome(doesntFollow.who, 1,
            (count) => {
                accCount = accCountSnapshot + count;
                return progressCallbackRatio(accCount, totalItemCount)
            }
        ) : null;
        // Remove them
        if (phase3Accounts != null) {
            currentAccounts = currentAccounts.filter(x => !phase3Accounts.some(y => x.did === y.did));
        }
    }
    if (notFollower?.who?.length > 0) {
        accCountSnapshot = accCount;
        // Phase 4: Get accounts followed by notFollower.who
        const phase4Accounts = notFollower ? await getFollowerSome(notFollower.who, 1,
            (count) => {
                accCount = accCountSnapshot + count;
                return progressCallbackRatio(accCount, totalItemCount)
            }
        ) : null;
        // Remove them
        if (phase4Accounts != null) {
            currentAccounts = currentAccounts.filter(x => !phase4Accounts.some(y => x.did === y.did));
        }
    }
    // TODO: Implement the rest of the logic, lists or whatever
    return currentAccounts;

}

async function getXSome(atIdentifiers, profileKey, call, resKey, _atLeast = null, _progressCallbackRatio = null) {
    var atLeast = _atLeast || atIdentifiers.length;
    const map = new Map();
    const profiles = [...await getProfiles(atIdentifiers)];
    profiles.sort((a, b) => a[profileKey] - b[profileKey]); // Sort less to more
    const totalItemCount = profiles.reduce((sum, item) => sum + item[profileKey], 0);
    var accCount = 0;
    const progressCallbackUnits = _progressCallbackRatio ? (count) => _progressCallbackRatio(count + accCount, totalItemCount) : () => { };
    for (var i = 0; i < profiles.length; i++) {
        if (i < profiles.length - 1) {
            const max = [...map.values()].reduce((max, item) => Math.max(max, item.count), 0);
            if (profiles.length - i + max < atLeast) {
                // No more chances to reach atLeast
                accCount = 0;
                progressCallbackUnits(totalItemCount);
                return [];
            }
        }
        const actorResult = await requestService.callPaged(call, { actor: atIdentifiers[i], limit: 100 }, resKey, progressCallbackUnits);
        accCount += actorResult.length;
        actorResult.forEach(item => {
            var item2 = map.get(item.did);
            if (item2) {
                item2.count++;
            } else {
                // Only if still have a chance to reach atLeast
                if (profiles.length - i >= atLeast) {
                    item2 = { ...item, count: 1 };
                    map.set(item.did, item2);
                }
            }
        });
    }
    return [...map.values()].filter(item => item.count >= atLeast);
}

export default { getWhoMeetsCriteria };