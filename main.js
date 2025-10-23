// 1. 在函数外部定义一个变量来追踪当前 Key 的索引
let currentKeyIndex = 0;

async function recognize(base64, lang, options) {
    const { config, utils } = options;
    const { tauriFetch: fetch } = utils;
    
    // 2. 从 config 中解构出所有的 5 个 Key
    let { 
        model = "gpt-4o", 
        apiKey1, apiKey2, apiKey3, apiKey4, apiKey5, 
        requestPath, customPrompt 
    } = config;

    // 3. 构建 Key 数组，并自动过滤掉所有空白、null 或 undefined 的 Key
    const apiKeys = [apiKey1, apiKey2, apiKey3, apiKey4, apiKey5]
                        .filter(key => key && key.trim().length > 0);

    if (apiKeys.length === 0) {
        throw "API Key 未配置。请在设置中至少填写一个 API Key。";
    }

    // 4. 轮询逻辑：选择当前的 Key，并更新索引
    // (如果索引超出了数组范围，比如用户刚删掉了一个 Key，则重置为 0)
    if (currentKeyIndex >= apiKeys.length) {
        currentKeyIndex = 0; 
    }
    
    const selectedApiKey = apiKeys[currentKeyIndex]; // (A) 选择当前 Key
    currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length; // (B) 更新索引，为下次调用做准备

    // --- 以下是您原来的代码，保持不变 ---

    if (!requestPath) {
        requestPath = "https://api.openai.com";
    }
    if (!/https?:\/\/.+/.test(requestPath)) {
        requestPath = `https://${requestPath}`;
    }
    if (requestPath.endsWith('/')) {
        requestPath = requestPath.slice(0, -1);
    }
    if (!requestPath.endsWith('/chat/completions')) {
        requestPath += '/v1/chat/completions';
    }
    if (!customPrompt) {
        customPrompt = "Just recognize the text in the image. Do not offer unnecessary explanations.";
    }else{
        customPrompt = customPrompt.replaceAll("$lang", lang);
    }

    const headers = {
        'Content-Type': 'application/json',
        // 5. 使用轮询选出的 'selectedApiKey'
        'Authorization': `Bearer ${selectedApiKey}`
    }

    const body = {
        model,
        messages: [
            {
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": customPrompt
                    }
                ],
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": `data:image/png;base64,${base64}`,
                            "detail": "high"
                        },
                    },
                ],
            }
        ],
    }
    let res = await fetch(requestPath, {
        method: 'POST',
        url: requestPath,
        headers: headers,
        body: {
            type: "Json",
            payload: body
        }
    });

    if (res.ok) {
        let result = res.data;
        return result.choices[0].message.content;
    } else {
        // 在抛出错误时也显示当前使用了哪个 Key，方便排错
        throw `Http Request Error (Using Key ending with: ...${selectedApiKey.slice(-4)})\nHttp Status: ${res.status}\n${JSON.stringify(res.data)}`;
    }
}
