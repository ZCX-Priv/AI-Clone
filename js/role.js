(function (global) {
  // 角色名称与其对应的提示词 Markdown 文件名
  const ROLES = [
    { 
      key: 'lyt', 
      name: '哈哈老师', 
      md: 'lyt.md', 
      leftMedia: './imgs/img01.jpg',  // 支持图片和视频
      mediaType: 'image',             // 'image' 或 'video'
      avatar: './avatars/avatar01.jpg',
      greeting: '你好！我是李雅婷老师，有什么想聊的吗？'
    },
    { 
      key: 'zxw', 
      name: '兴旺老师', 
      md: 'zxw.md', 
      leftMedia: './imgs/img02.jpg', 
      mediaType: 'image', 
      avatar: './avatars/avatar02.jpg',
      greeting: '嗨！我是张兴旺老师，有什么问题尽管问！'
    },
    { 
      key: 'hjl', 
      name: 'Shida Linx', 
      md: 'hjl.md', 
      leftMedia: './imgs/img03.jpg', 
      mediaType: 'image', 
      avatar: './avatars/avatar03.jpg',
      greeting: '人生的疑问往往是最好的开始。让我们从一个简单的问题出发——你今天在想些什么？'
    }
    // 示例：如果您有视频文件，可以这样配置：
    // { 
    //   key: 'video_character', 
    //   name: '视频角色', 
    //   md: 'video_character.md', 
    //   leftMedia: './videos/character.mp4',  // 视频文件路径
    //   mediaType: 'video',                   // 指定为视频类型
    //   avatar: './avatars/video_avatar.jpg',
    //   greeting: '你好！我是视频角色，很高兴与你见面！ 🎬'
    // }
  ];

  // 工具函数：根据文件扩展名自动检测媒体类型
  function detectMediaType(filePath) {
    if (!filePath) return 'image';
    
    const extension = filePath.toLowerCase().split('.').pop();
    const videoExtensions = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'm4v'];
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    
    if (videoExtensions.includes(extension)) {
      return 'video';
    } else if (imageExtensions.includes(extension)) {
      return 'image';
    }
    
    return 'image'; // 默认为图片
  }

  // 自动检测并设置媒体类型（如果没有手动指定）
  ROLES.forEach(role => {
    if (!role.mediaType && role.leftMedia) {
      role.mediaType = detectMediaType(role.leftMedia);
    }
    
    // 保持向后兼容性：如果使用旧的 leftImage 字段
    if (role.leftImage && !role.leftMedia) {
      role.leftMedia = role.leftImage;
      role.mediaType = 'image';
    }
  });

  // 获取默认角色（使用第一个角色）
  function getDefaultRole() {
    return ROLES.length > 0 ? ROLES[0].key : 'companion';
  }

  // 获取角色的开场白
  function getRoleGreeting(roleKey) {
    const role = ROLES.find(r => r.key === roleKey);
    return role?.greeting || '你好！我是你的AI陪伴，有什么想聊的吗？ 😊';
  }

  // 暴露到全局（浏览器环境）
  global.ROLES = ROLES;
  global.getDefaultRole = getDefaultRole;
  global.detectMediaType = detectMediaType;
  global.getRoleGreeting = getRoleGreeting;
})(window);