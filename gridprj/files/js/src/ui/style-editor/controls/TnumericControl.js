
import { TbaseControl } from './TbaseControl.js';

export class TnumericControl extends TbaseControl {
     render() {
        const container = document.createElement("div");
        container.style.display = 'flex';
        const numInput = document.createElement("input");
        numInput.type = "number";
        numInput.style.flex = '2';
        
        const unitSelect = document.createElement("select");
        unitSelect.style.flex = '1';
        const units = this.getAvailableUnits();
        units.forEach(unit => {
            const opt = document.createElement("option");
            opt.value = unit;
            opt.textContent = unit;
            unitSelect.appendChild(opt);
        });
        
        const match = this.initialValue.match(/(-?[\d.]+)([a-z%]*)/i);
        if (match) {
            numInput.value = match[1];
            if (units.includes(match[2])) {
                unitSelect.value = match[2];
            }
        }
        
        const update = () => {
            this.onChange(`${numInput.value}${unitSelect.value}`);
        };

        numInput.addEventListener("change", update);
        unitSelect.addEventListener("change", update);
        
        container.append(numInput, unitSelect);
        return container;
    }

    getAvailableUnits() {
        const values = this.meta.values || [];
        let units = [];
        if (values.includes('[length]')) units.push('px', 'em', 'rem', '%', 'vw', 'vh');
        if (values.includes('[percent]')) units.push('%');
        if (values.includes('[time]')) units.push('s', 'ms');
        return [...new Set(units)];
    }
}
window.TnumericControl = TnumericControl;