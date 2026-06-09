// Action: add_voucher — opens /voucher, clicks Add Voucher, fills the simple
// modal (code + discount + expiry), submits. Used as the proving-ground action
// for the simulator pipeline because the form is small and there are no nested
// pickers.

export default {
  id: "add_voucher",
  description: "Create a discount voucher via the Add Voucher modal on /voucher",
  fields: {
    code: { type: "string", required: true, example: "SIM20" },
    discount_type: {
      type: "enum:percentage,fixed",
      required: true,
      default: "fixed",
      example: "fixed",
    },
    discount_value: { type: "number", required: true, example: 20 },
    expiry_type: {
      type: "enum:monthly,specific_date",
      required: true,
      default: "monthly",
      example: "monthly",
      desc: "monthly = expires N months after issue; specific_date = expires on a fixed date",
    },
    expiry_months: {
      type: "number",
      required: false,
      example: 2,
      desc: "Required when expiry_type=monthly",
    },
    expiry_date: {
      type: "date",
      required: false,
      example: "2026-12-31",
      desc: "Required when expiry_type=specific_date",
    },
  },
  defaultExpectations: ({ code }) => ({
    "*": [{ field: "voucher_table.row_visible", expected: true, by: { searchText: code } }],
  }),
  ui: async (browser, args) => {
    browser.open("/voucher");
    browser.clickButton("Add Voucher");

    browser.fillLabel("Coupon Code", args.code);

    // Discount Type combobox renders option labels "Percentage" / "Fixed".
    browser.selectByLabel("Discount Type", labelForDiscountType(args.discount_type));

    // The discount value input's label is dynamic — "(%)" or "(RM)".
    const valLabel =
      args.discount_type === "percentage" ? "Discount (%)" : "Discount (RM)";
    browser.fillLabel(valLabel, String(args.discount_value));

    browser.selectByLabel("Expiry Type", labelForExpiryType(args.expiry_type));

    if (args.expiry_type === "monthly") {
      browser.fillLabel("Valid For (months)", String(args.expiry_months ?? 1));
    } else {
      browser.fillLabel("Expiry Date", String(args.expiry_date));
    }

    // Submit. The modal's submit button reuses the label "Add Voucher" — same
    // text as the page-level toolbar button that opens the modal. Use the
    // dialog-scoped clicker so we hit the SUBMIT button, not the toolbar one.
    browser.clickDialogButton("Add Voucher");
  },
};

function labelForDiscountType(v) {
  return v === "percentage" ? "Percentage (%)" : "Fixed (RM)";
}

function labelForExpiryType(v) {
  return v === "monthly" ? "Monthly (from usage)" : "Specific Date";
}
