function union(...sets) {
    const map = new Map();
    sets.forEach(set => set.forEach(item => {
        map.set(item.did, item)
    }
    ));
    return [...map.values()];
}
function intersectionCount(...sets) {
    const map = new Map();
    sets.forEach(set => set.forEach(item => {
        var item2 = map.get(item.did);
        if (item2) {
            item2.count++;
        } else {
            item2 = { ...item, count: 1 };
            map.set(item.did, item2);
        }
    }));
    const result = [...map.values()];
    result.sort((a, b) => b.count - a.count);
    return result;
}

export default { union, intersectionCount };