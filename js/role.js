(function (global) {
  // 角色名称与其对应的提示词 Markdown 文件名
  const ROLES = [
    { 
      key: 'companion', 
      name: '陪伴者', 
      md: 'companion.md', 
      leftMedia: './imgs/img01.jpg',  // 支持图片和视频
      mediaType: 'image',             // 'image' 或 'video'
      avatar: './avatars/avatar01.jpg',
      greeting: '你好！我是你的温柔陪伴者，无论你遇到什么困扰或想要分享什么心情，我都会耐心倾听。有什么想聊的吗？ 😊'
    },
    { 
      key: 'friend', 
      name: '朋友', 
      md: 'friend.md', 
      leftMedia: './imgs/img02.jpg', 
      mediaType: 'image', 
      avatar: './avatars/avatar02.jpg',
      greeting: '嗨！很高兴见到你！我是你的AI朋友，我们可以聊任何有趣的话题。今天过得怎么样？ 🌟'
    },
    { 
      key: 'mentor', 
      name: '导师', 
      md: 'mentor.md', 
      leftMedia: './imgs/img03.jpg', 
      mediaType: 'image', 
      avatar: './avatars/avatar03.jpg',
      greeting: '欢迎！我是你的AI导师，很乐意为你答疑解惑，分享知识和经验。有什么问题想要探讨吗？ 📚'
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

  // 获取角色的开场白
  function getRoleGreeting(roleKey) {
    const role = ROLES.find(r => r.key === roleKey);
    return role?.greeting || '你好！我是你的AI陪伴，有什么想聊的吗？ 😊';
  }

  // 暴露到全局（浏览器环境）
  global.ROLES = ROLES;
  global.detectMediaType = detectMediaType;
  global.getRoleGreeting = getRoleGreeting;
})(window);