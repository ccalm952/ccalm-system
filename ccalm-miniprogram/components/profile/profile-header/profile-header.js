const { getSession } = require("../../../store/session");
const { readAvatar, saveAvatar } = require("../../../utils/avatar");

Component({
  properties: {
    badge: { type: String, value: "" },
  },

  data: {
    displayName: "",
    avatarUrl: "",
    avatarText: "我",
  },

  lifetimes: {
    attached() {
      this.refresh();
    },
  },

  methods: {
    refresh() {
      const session = getSession();
      if (!session || !session.user) return;
      const user = session.user;
      const displayName = user.displayName || user.username || "";
      this.userId = user.id || "";
      this.setData({
        displayName,
        avatarUrl: readAvatar(this.userId),
        avatarText: displayName.slice(0, 1) || "我",
      });
    },

    async onChooseAvatar(event) {
      const temporary = (event.detail && event.detail.avatarUrl) || "";
      if (!temporary) return;
      try {
        const saved = await saveAvatar(this.userId, temporary);
        this.setData({ avatarUrl: saved });
      } catch (_) {
        this.setData({ avatarUrl: temporary });
      }
    },

    onTodoTap() {
      this.triggerEvent("todo");
    },
  },
});
