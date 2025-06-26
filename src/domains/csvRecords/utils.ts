export const removeSlashes = (str: string) => {
  // 首先移除所有的斜杠和空格
  const withoutSlashes = str.replace(/\//g, "");

  // 如果字符串长度小于2，直接返回原字符串（移除斜杠后的）
  if (withoutSlashes.length < 2) {
    return withoutSlashes;
  }

  // 获取前两个字符
  const firstTwoChars = withoutSlashes.substring(0, 2);

  // 获取剩余内容（从第3个字符开始）
  const remainingContent = withoutSlashes.substring(2);

  // 返回格式化后的字符串：前两个字母 + 两个空格 + 剩余内容
  return firstTwoChars.trim() + "  " + remainingContent.trim();
};

export const extractDigits = (str: string) => {
  return str.replace(/[^\d.,]/g, "");
};
