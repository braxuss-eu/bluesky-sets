import { CredentialManager, XRPC } from "@atcute/client";

var rpc = new XRPC({
    handler: new CredentialManager({ service: "https://public.api.bsky.app" }),
});

async function callPaged(call, _params, resKey, progressCallbackUnits) {
    const params = { ..._params };
    var result = [];
    var res = await rpc.get(call, { params });
    result.push(...(res.data?.[resKey] || []));
    while (res.data?.cursor) {
        if (progressCallbackUnits) {
            progressCallbackUnits(result.length);
        }
        params.cursor = res.data.cursor;
        res = await rpc.get(call, { params });
        result.push(...(res.data?.[resKey] || []));
    }
    if (progressCallbackUnits) {
        progressCallbackUnits(result.length);
    }
    return result;
}

async function callPartitioned(call, paramsFunction, list, count, resKey, progressCallbackUnits) {
    var result = [];
    var index = 0;
    while (index < list.length) {
        const partition = list.slice(index, index + count);
        const params = paramsFunction(partition);
        var res = await rpc.get(call, { params });
        result.push(...(res.data?.[resKey] || []));
        while (res.data?.cursor) {
            if (progressCallbackUnits) {
                progressCallbackUnits(result.length);
            }
            params.cursor = res.data.cursor;
            res = await rpc.get(call, { params });
            result.push(...(res.data?.[resKey] || []));
        }
        if (progressCallbackUnits) {
            progressCallbackUnits(result.length);
        }
        index += count;
    }
    return result;
}

export default { callPaged, callPartitioned };