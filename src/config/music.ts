/**
 * 侧栏音乐播放器 · 播放列表
 *
 * 参考 Firefly 的 config/musicConfig.ts，但去掉 Meting 在线音源：
 * 本站是纯静态站，外链音频一是不稳、二是有版权风险，所以只留「本地列表」。
 *
 * 换成自己的歌：
 *   1. 把 mp3 放到 public/music/ 下（可以是子目录）；
 *   2. 在下面 playlist 里改 url / cover / name / artist，url 用 /music/xxx.mp3；
 *   3. 想加歌词就把 .lrc 放 public/music/lrc/ 并填 lrc 路径（可选）。
 *
 * 现在这三条是脚本生成的示例音（42 秒氛围音），只为验证播放器交互，
 * 换成真实音乐后直接删掉 public/music/*.mp3 即可。
 */

export interface MusicTrack {
  name: string;
  artist: string;
  url: string;
  cover: string;
  /** 歌词文件路径或 [00:00.00] 开头的歌词字符串，留空则不显示歌词 */
  lrc?: string;
}

export const musicPlaylist: MusicTrack[] = [
  {
    name: '晨光',
    artist: '示例音轨 · 42s',
    url: '/music/morning-light.mp3',
    cover: '/music/cover/morning-light.svg',
  },
  {
    name: '午后散步',
    artist: '示例音轨 · 42s',
    url: '/music/afternoon-walk.mp3',
    cover: '/music/cover/afternoon-walk.svg',
  },
  {
    name: '夜行',
    artist: '示例音轨 · 42s',
    url: '/music/night-drive.mp3',
    cover: '/music/cover/night-drive.svg',
  },
];
