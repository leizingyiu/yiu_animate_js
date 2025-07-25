import { yiu_strSplit, yiu_strSpliter, yiu_strJoin } from "./yiu_strSplitAndJoin.js";
import fixFloatPrecision from "./fixFloatPrecision.js";

const split = yiu_strSplit;
const spliter = yiu_strSpliter;
const joiner = yiu_strJoin;

class CSSCalcEvaluator {
    constructor({ updateInterval = 100 } = {}) {
        this.unitMap = {};
        this.updateInterval = updateInterval;
        this._lastUpdateTime = 0;
        this._pendingUpdate = null;

        this._bindEvents();
        this.updateUnitContext(); // 初始执行一次
    }

    _bindEvents() {
        window.addEventListener('resize', this._debouncedUpdate.bind(this));
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this._debouncedUpdate.bind(this));
        } else {
            this._debouncedUpdate();
        }
    }

    _debouncedUpdate() {
        const now = Date.now();
        const elapsed = now - this._lastUpdateTime;

        if (elapsed > this.updateInterval) {
            this.updateUnitContext();
        } else {
            clearTimeout(this._pendingUpdate);
            this._pendingUpdate = setTimeout(() => this.updateUnitContext(), this.updateInterval);
        }
    }

    updateUnitContext() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);

        this.unitMap = {
            px: 1,
            vw: width / 100,
            vh: height / 100,
            vmin: Math.min(width, height) / 100,
            vmax: Math.max(width, height) / 100,
            rem: fontSize,
        };

        this._lastUpdateTime = Date.now();
    }

    // 解析 var 和 attr
    resolveVarsAndAttrs(str, dom) {
        const computedStyle = getComputedStyle(dom);

        str = str.replace(/var\((--[^)]+)\)/g, (_, name) => {
            const value = computedStyle.getPropertyValue(name).trim();
            return value || '0px';
        });

        str = str.replace(/attr\(([\w-]+)\s+([a-z%]+)\)/g, (_, attrName, unit) => {
            const attrVal = dom.getAttribute(attrName);
            return attrVal ? `${attrVal}${unit}` : `0${unit}`;
        });

        return str;
    }

    // 动态获取单位数值
    getDynamicUnitPx(unit, dom) {
        if (unit === 'em') {
            const fs = parseFloat(getComputedStyle(dom).fontSize);
            return fs || 16;
        }
        if (unit === '%') {
            // 无法通用，需要用户指定上下文含义，否则设为 1
            return 1;
        }
        return this.unitMap[unit] || 1;
    }

    convertToPx(valueWithUnit, dom) {
        const match = /^([-+]?\d*\.?\d+)([a-z%]+)?$/i.exec(valueWithUnit.trim());
        if (!match) return 0;

        const [, numberStr, unit] = match;
        const number = parseFloat(numberStr);
        const factor = this.getDynamicUnitPx(unit || 'px', dom);
        return number * factor;
    }

    evaluate(dom, expression, outputUnit = 'px', withUnit = true) {
        if (!dom) throw new Error('DOM element is required for evaluation.');

        const exps = split(expression);
        // console.log('Evaluating expression:', expression, 'Parts:', exps);


        if (exps.length > 1) {
            const separator = spliter(expression);
            return joiner(exps
                .map(e => this.evaluate(dom, e, outputUnit, withUnit))
                , (separator));
        }

        let resolved = this.resolveVarsAndAttrs(expression, dom);
        resolved = resolved.trim().replace(/^calc\((.*)\)$/i, '$1');

        // console.log('Resolved expression:', resolved);

        let numericExpr = resolved.replace(/([-+]?\d*\.?\d+[a-z%]+)/gi, match => {
            return this.convertToPx(match, dom);
        });

        // console.log('Numeric Expression:', numericExpr);
        numericExpr = numericExpr.replace(/calc/g, '').trim();
        // console.log('Numeric Expression:', numericExpr);

        try {
            const resultPx = new Function(`return (${numericExpr});`)();
            const outputFactor = outputUnit ? this.getDynamicUnitPx(outputUnit, dom) : 1;
            const resultNum = resultPx / outputFactor;
            const result = (withUnit && outputUnit ? `${resultNum}${outputUnit}` : resultNum);
            // console.log('Final Result:', result);
            return result.replace(/([\d\.]+)/g, (match, p1) => fixFloatPrecision(p1));
        } catch (e) {
            console.error('Evaluation error:', numericExpr, e);
            return NaN;
        }
    }

}

if (typeof window !== 'undefined') {
    window.CSSCalcEvaluator = CSSCalcEvaluator;
}

export default CSSCalcEvaluator;