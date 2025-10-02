(function (global) {
  // 角色名称与其对应的提示词 Markdown 文件名
  const ROLES = [
    { 
      key: 'companion', 
      name: '陪伴者', 
      md: 'companion.md', 
      leftMedia: './imgs/img01.jpg',  // 支持图片和视频
      mediaType: 'image',             // 'image' 或 'video'
      avatar: './avatars/avatar01.jpg' 
    },
    { 
      key: 'friend', 
      name: '朋友', 
      md: 'friend.md', 
      leftMedia: './imgs/img02.jpg', 
      mediaType: 'image', 
      avatar: './avatars/avatar02.jpg' 
    },
    { 
      key: 'mentor', 
      name: '导师', 
      md: 'mentor.md', 
      leftMedia: './imgs/img03.jpg', 
      mediaType: 'image', 
      avatar: './avatars/avatar03.jpg' 
    }
    // 示例：如果您有视频文件，可以这样配置：
    // { 
    //   key: 'video_character', 
    //   name: '视频角色', 
    //   md: 'video_character.md', 
    //   leftMedia: './videos/character.mp4',  // 视频文件路径
    //   mediaType: 'video',                   // 指定为视频类型
    //   avatar: './avatars/video_avatar.jpg' 
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

  // 暴露到全局（浏览器环境）
  global.ROLES = ROLES;
  global.detectMediaType = detectMediaType;
})(window);