const { TABS } = require("../../../constants/tabs");

Component({
  properties: {
    current: { type: Number, value: 0 },
    missingBadge: { type: String, value: "" },
  },

  data: {
    items: TABS.map((tab) => ({
      key: tab.key,
      label: tab.label,
      icon: tab.icon,
      badge: tab.badge || "",
    })),
  },

  methods: {
    onTap(event) {
      const index = Number(event.currentTarget.dataset.index);
      if (!Number.isFinite(index) || index === this.properties.current) return;
      this.triggerEvent("change", { index });
    },
  },
});
