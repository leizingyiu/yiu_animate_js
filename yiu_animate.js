import CSSCalcEvaluator from "./utils/yiu_cssCalcEvaluator.js";

function cubicBezier(p1x, p1y, p2x, p2y) {
    const cx = 3 * p1x;
    const bx = 3 * (p2x - p1x) - cx;
    const ax = 1 - cx - bx;

    const cy = 3 * p1y;
    const by = 3 * (p2y - p1y) - cy;
    const ay = 1 - cy - by;

    function bezierX(t) {
        return ((ax * t + bx) * t + cx) * t;
    }

    function bezierY(t) {
        return ((ay * t + by) * t + cy) * t;
    }

    function getTforX(x) {
        let t = x;
        for (let i = 0; i < 5; i++) {
            const xEst = bezierX(t);
            const dx = ((3 * ax * t + 2 * bx) * t + cx);
            if (Math.abs(dx) < 1e-6) break;
            t -= (xEst - x) / dx;
        }
        return t;
    }

    return function (x) {
        return bezierY(getTforX(x));
    };
}

const easingFunctions = {
    linear: x => x,
    ease: cubicBezier(0.25, 0.1, 0.25, 1.0),
    easeIn: x => x * x,
    easeOut: x => x * (2 - x),
    easeInOut: x => x < 0.5 ? 2 * x * x : -1 + (4 - 2 * x) * x,
    easeOutElastic: x => {
        const c4 = (2 * Math.PI) / 3;
        const result = x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
        // console.log(`easeOutElastic(${x}) = ${result}`);
        return result;
    },
    easeOutBounce: x => {
        const n1 = 7.5625, d1 = 2.75;
        if (x < 1 / d1) { result = n1 * x * x; }
        else if (x < 2 / d1) { result = n1 * (x -= 1.5 / d1) * x + 0.75; }
        else if (x < 2.5 / d1) { result = n1 * (x -= 2.25 / d1) * x + 0.9375; }
        else { result = n1 * (x -= 2.625 / d1) * x + 0.984375; }

        // console.log(`easeOutBounce(${x}) = ${result}`);
        return result;
    }
};

function isCSSEase(name) {
    return ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'].includes(name);
}

function parseTransformEase(str, dom) {
    const evaluator = new CSSCalcEvaluator({ updateInterval: 200 });

    const segments = [];
    let current = '';
    let depth = 0;

    // -----------------------------
    // 1️⃣ 拆分 transform 函数（空格或逗号分隔，括号内部不拆）
    // -----------------------------
    for (let char of str) {
        switch (char) {
            case '(':
                depth++;
                current += char;
                break;
            case ')':
                depth--;
                current += char;
                break;
            case ' ':
            case ',':
                if (depth === 0) {   // 顶层分隔符
                    if (current.trim()) segments.push(current.trim());
                    current = '';
                    break;
                }
                current += char;       // 括号内部空格/逗号直接加
                break;
            default:
                current += char;
        }
    }
    if (current.trim()) segments.push(current.trim());

    // -----------------------------
    // 2️⃣ 分离每个 transform 的冒号参数
    // -----------------------------
    const unitDict = {
        "translate": "px", "translateX": "px", "translateY": "px",
        "scale": " ", "scaleX": " ", "scaleY": " ",
        "rotate": "deg", "skew": "deg", "skewX": "deg", "skewY": "deg",
        "translate3d": "px", "translateZ": "px",
        "scale3d": "", "scaleZ": "",
        "rotateX": "deg", "rotateY": "deg", "rotateZ": "deg", "rotate3d": "deg",
        "perspective": "px"
    };

    let globalEase = null;
    let globalDuration = null;
    let globalDelay = null;

    // -----------------------------
    // 3️⃣ 解析每个 segment
    // -----------------------------
    const result = segments.map(segment => {
        const parts = segment.split(':').map(s => s.trim());
        const match = parts[0].match(/(\w+)\(([^(]+)\)/);
        if (!match) return null;

        const fn = match[1];
        const args = match[2]
            .split(',')
            .map(v => v.trim())
            .map(_a => evaluator.evaluate(dom, _a, unitDict[fn] || 'px'));

        let ease = null, duration = null, delay = null;

        for (let i = 1; i < parts.length; i++) {
            const p = parts[i];
            if (p.startsWith('delay(')) {
                const m = p.match(/delay\((\d+)\)/);
                if (m) delay = parseFloat(m[1]);
            } else if (p.startsWith('dura(')) {
                const m = p.match(/dura\((\d+)\)/);
                if (m) duration = parseFloat(m[1]);
            } else if (isFinite(Number(p))) {
                duration = parseFloat(p);
            } else {
                ease = p;
            }
        }

        // 保存最后解析到的全局参数
        if (ease) globalEase = ease;
        if (duration != null) globalDuration = duration;
        if (delay != null) globalDelay = delay;

        return { fn, args, ease, duration, delay, raw: segment };
    }).filter(Boolean);

    // -----------------------------
    // 4️⃣ 将全局参数应用到没有单独指定参数的 transform
    // -----------------------------
    for (let t of result) {
        if (t.ease == null) t.ease = globalEase;
        if (t.duration == null) t.duration = globalDuration;
        if (t.delay == null) t.delay = globalDelay;
    }

    console.log('Parsed transforms result :', result);
    return result;
}


function parseOpacityEase(str, globalDefaults = {}) {
    if (!str) return null;
    const parts = str.split(':').map(s => s.trim());
    const value = parseFloat(parts[0]);
    let ease = null, delay = null, duration = null;

    for (let i = 1; i < parts.length; i++) {
        if (parts[i].startsWith('delay(')) {
            const m = parts[i].match(/delay\((\d+)\)/);
            if (m) delay = parseFloat(m[1]);
        } else if (/^\d+(\.\d+)?$/.test(parts[i])) {
            duration = parseFloat(parts[i]);
        } else if (parts[i].startsWith('dura(')) {
            const m = parts[i].match(/dura\((\d+)\)/);
            if (m) duration = parseFloat(m[1]);
        } else {
            ease = parts[i];
        }
    }

    return {
        value,
        ease: ease ?? globalDefaults.ease ?? 'ease',
        duration: duration ?? globalDefaults.duration ?? 2000,
        delay: delay ?? globalDefaults.delay ?? 0
    };
}



function interpolateArgs(startArgs, endArgs, eased) {
    return startArgs.map((startVal, i) => {
        const s = parseFloat(startVal), e = parseFloat(endArgs[i]);
        const unit = endArgs[i].replace(e, '');
        return `${s + (e - s) * eased}${unit}`;
    });
}

function start_animation(dom) {

    const styles = getComputedStyle(dom);

    const startStr = styles.getPropertyValue('--yiu-animate-start-transform').trim();
    const endStr = styles.getPropertyValue('--yiu-animate-end-transform').trim();
    const defaultEase = styles.getPropertyValue('--yiu-animate-ease-fn').trim() || 'linear';
    const defaultDuration = parseFloat(styles.getPropertyValue('--yiu-animate-ease-dura')) || 2000;
    const globalDelay = parseFloat(styles.getPropertyValue('--yiu-animate-delay')) || 0;

    const startList = parseTransformEase(startStr, dom);
    const endList = parseTransformEase(endStr, dom);

    const startOpacityStr = styles.getPropertyValue('--yiu-animate-start-opacity').trim();
    const endOpacityStr = styles.getPropertyValue('--yiu-animate-end-opacity').trim();

    const startOpacity = parseOpacityEase(startOpacityStr, {
        ease: defaultEase,
        duration: defaultDuration,
        delay: globalDelay
    });

    const endOpacity = endOpacityStr ? parseFloat(endOpacityStr) : null;

    const transforms = startList.map((startItem, i) => {
        const endItem = endList[i];
        if (!endItem) return null;

        const easeName = startItem.ease || defaultEase;
        const easeFn = easingFunctions[easeName] || ((t) => t);

        const delay = startItem.delay ?? globalDelay;
        const duration = startItem.duration ?? defaultDuration;

        if (!easingFunctions[easeName] && !isCSSEase(easeName)) {
            console.error(`未知 easing 函数：${easeName}，跳过该项：${startItem.raw}`);
            return null;
        }

        if (endItem.ease || endItem.delay)
            console.warn(`警告：easing / delay 应写在 start - transform，而不是 end - transform：${endItem.raw}`);

        return { fn: startItem.fn, startArgs: startItem.args, endArgs: endItem.args, ease: easeFn, delay, duration };

    }).filter(Boolean);

    const startTime = performance.now();

    console.trace('startList', JSON.stringify(startList, null, 2));
    console.trace('Transforms to animate:', JSON.stringify(transforms, null, 2));



    const tempEl = document.createElement('div');
    document.body.appendChild(tempEl);
    tempEl.style.position = 'absolute';
    tempEl.style.visibility = 'hidden';
    function resolveCalc(value) {
        if (!value.includes('calc(')) return value;

        tempEl.style.setProperty('--temp', value);
        const computed = getComputedStyle(tempEl).getPropertyValue('--temp').trim();
        console.log('Resolved calc:', value, '=>', computed);
        return computed || value;
    }



    function animate(now) {
        const elapsed = now - startTime;

        // const transformStr = transforms.map(t => {
        //     const tElapsed = elapsed - t.delay;
        //     if (tElapsed < 0) return `${t.fn}(${t.startArgs.join(', ')})`;
        //     const progress = Math.min(tElapsed / t.duration, 1);
        //     const eased = t.ease(progress);
        //     const args = interpolateArgs(t.startArgs, t.endArgs, eased);
        //     return `${t.fn}(${args.join(', ')})`;
        // }).join(' ');


        const transformStr = transforms.map(t => {

            const tElapsed = elapsed - t.delay;
            if (tElapsed < 0) return `${t.fn}(${t.startArgs.join(', ')})`;
            const progress = Math.min(tElapsed / t.duration, 1);

            const eased = t.ease(progress);

            // console.log("t.startArgs, t.endArgs");
            // console.log(t.startArgs, t.endArgs);
            // console.log(t.startArgs.map(_a => evaluator.evaluate(dom, _a, 'px')),
            //     t.endArgs.map(_a => evaluator.evaluate(dom, _a, 'px'))
            // );


            const args = interpolateArgs(t.startArgs, t.endArgs, eased);
            // const args = interpolateArgs(
            //     t.startArgs.map(_a => evaluator.evaluate(dom, _a, 'px')),
            //     t.endArgs.map(_a => evaluator.evaluate(dom, _a, 'px')),
            //     eased
            // );
            return `${t.fn}(${args.join(', ')})`;
        }).join(' ');



        console.log(dom.id, "elapsed:", elapsed, '\tTransform string:', transformStr);
        dom.style.transform = transformStr;

        if (startOpacity && endOpacity !== null) {
            const oElapsed = elapsed - startOpacity.delay;
            if (oElapsed >= 0) {
                const progress = Math.min(oElapsed / startOpacity.duration, 1);
                const eased = (easingFunctions[startOpacity.ease] || (t => t))(progress);
                const currentOpacity = startOpacity.value + (endOpacity - startOpacity.value) * eased;
                dom.style.opacity = currentOpacity;
            } else {
                dom.style.opacity = startOpacity.value;
            }
        }


        if (elapsed < Math.max(...transforms.map(t => t.delay + t.duration))) {
            requestAnimationFrame(animate);
        }
    }
    requestAnimationFrame(animate);
}


// 如果在浏览器环境中，挂载到全局（window）
if (typeof window !== 'undefined') {
    window.start_animation = start_animation;
}

export default start_animation;