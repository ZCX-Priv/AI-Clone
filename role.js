(function (global) {
  // 角色名称与其对应的提示词 Markdown 文件名
  const ROLES = [
    { key: 'companion', name: '陪伴者', md: 'companion.md', leftImage: './imgs/img01.jpg', avatar: './avatars/avatar01.jpg' },
    { key: 'friend',    name: '朋友',   md: 'friend.md',    leftImage: './imgs/img02.jpg', avatar: './avatars/avatar02.jpg' },
    { key: 'mentor',    name: '导师',   md: 'mentor.md',    leftImage: './imgs/img03.jpg', avatar: './avatars/avatar03.jpg' }
  ];

  // 暴露到全局（浏览器环境）
  global.ROLES = ROLES;
})(window);