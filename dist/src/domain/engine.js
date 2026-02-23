export const executeSlots = (total, slots) => {
    if (slots.length === 0) {
        return total;
    }
    return slots.reduce((nextTotal, slot) => {
        if (slot.operator === "+") {
            return nextTotal + slot.operand;
        }
        throw new Error(`Unsupported operator: ${slot.operator}`);
    }, total);
};
//# sourceMappingURL=engine.js.map