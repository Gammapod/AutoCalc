export const unlockCatalog = [
    {
        id: "max_total_digits_3",
        description: "Increase max total digits to 3.",
        predicate: { type: "roll_length_at_least", length: 1 },
        effect: { type: "increase_max_total_digits", amount: 1 },
        once: true,
    },
];
//# sourceMappingURL=unlocks.catalog.js.map