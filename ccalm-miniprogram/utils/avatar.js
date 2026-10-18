function avatarStorageKey(userId) {
  return `ccalm:wx-avatar:${userId || ""}`;
}

/**
 * 读取本地已保存的头像路径。
 * @param {string} userId
 * @returns {string}
 */
function readAvatar(userId) {
  try {
    return wx.getStorageSync(avatarStorageKey(userId)) || "";
  } catch (_) {
    return "";
  }
}

/**
 * 保存微信 chooseAvatar 返回的临时文件，并清理旧头像。
 * @param {string} userId
 * @param {string} tempFilePath
 * @returns {Promise<string>} 保存后的本地路径
 */
function saveAvatar(userId, tempFilePath) {
  const previous = readAvatar(userId);
  const fs = wx.getFileSystemManager();
  return new Promise((resolve, reject) => {
    fs.saveFile({
      tempFilePath,
      success(result) {
        const savedPath = result.savedFilePath;
        try {
          wx.setStorageSync(avatarStorageKey(userId), savedPath);
        } catch (_) {
          // 存储失败时至少本次仍使用临时路径
        }
        if (previous && previous !== savedPath) {
          fs.unlink({ filePath: previous, fail() {} });
        }
        resolve(savedPath);
      },
      fail(error) {
        reject(error);
      },
    });
  });
}

module.exports = {
  readAvatar,
  saveAvatar,
};
