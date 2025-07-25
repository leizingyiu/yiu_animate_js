function yiu_strSplitToArr(input) {
    const result = [];
    let stack = []; // 用来匹配括号和引号
    let current = '';
    let inQuote = false;
    let quoteChar = '';
    let i = 0;

    const isOpen = c => ['(', '[', '{'].includes(c);
    const isClose = c => [')', ']', '}'].includes(c);
    const match = { '(': ')', '[': ']', '{': '}' };

    const isSplitChar = c => [',', ';'].includes(c);

    while (i < input.length) {
        const char = input[i];

        // 处理引号
        if (!inQuote && ['"', "'", '`'].includes(char)) {
            inQuote = true;
            quoteChar = char;
            current += char;
            i++;
            continue;
        }

        if (inQuote) {
            current += char;
            if (char === quoteChar && input[i - 1] !== '\\') {
                inQuote = false;
                quoteChar = '';
            }
            i++;
            continue;
        }

        // 括号开始
        if (isOpen(char)) {
            stack.push(match[char]);
            current += char;
            i++;
            continue;
        }

        // 括号结束
        if (isClose(char)) {
            if (stack.length > 0 && stack[stack.length - 1] === char) {
                stack.pop();
                current += char;
                i++;
                continue;
            } else {
                // 括号不匹配，继续收集
                current += char;
                i++;
                continue;
            }
        }

        // 遇到分隔符，且当前不在括号或引号中
        if (isSplitChar(char) && stack.length === 0) {
            // 结束当前 token
            if (current.trim()) result.push(current.trim());
            current = '';

            // 跳过后面的空格
            i++;
            while (input[i] === ' ') i++;
            continue;
        }

        current += char;
        i++;
    }

    if (current.trim()) result.push(current.trim());

    return result;
}

function yiu_strArrSpliter(input, segments = yiu_strSplitToArr(input)) {
    let remaining = input;
    const separators = [];

    for (let i = 0; i < segments.length - 1; i++) {
        const current = segments[i];
        const next = segments[i + 1];

        const currentIndex = remaining.indexOf(current);
        if (currentIndex === -1) return []; // 不匹配就返回空数组

        const afterCurrent = remaining.slice(currentIndex + current.length);
        const nextIndex = afterCurrent.indexOf(next);
        if (nextIndex === -1) return [];

        const separator = afterCurrent.slice(0, nextIndex);
        separators.push(separator.trim()); // 如果你需要保留原始空格就去掉 trim()

        // 更新 remaining，继续找下一段
        remaining = afterCurrent.slice(nextIndex);
    }

    return separators;
}


function yiu_strArrJoin(parts, delimiters) {
    let result = '';

    for (let i = 0; i < parts.length; i++) {
        result += parts[i];
        if (i < delimiters.length) {
            result += delimiters[i];
        }
    }

    return result;
}



if (typeof window !== 'undefined') {
    window.yiu_strSplit = yiu_strSplitToArr;
    window.yiu_strSpliter = yiu_strArrSpliter;
    window.yiu_strJoin = yiu_strArrJoin;
}

export { yiu_strSplitToArr as yiu_strSplit, yiu_strArrSpliter as yiu_strSpliter, yiu_strArrJoin as yiu_strJoin };