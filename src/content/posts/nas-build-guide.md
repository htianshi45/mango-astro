---
title: 也许是最实用的万兆NAS 超长文分页
description: 从选型到组装，再到系统部署，一篇把万兆 NAS 讲透的长文。
pubDate: 2024-10-01
heroImage: /images/test-1.jpg
author: 疯狂的叔叔
avatar: /images/avatar-1.svg
tags:
  - NAS
  - 数码
  - 教程
category: 科技
sticky: 15
views: 8642
likes: 412
draft: false
---
折腾这台万兆 NAS 的起因很简单：家里的照片和视频越攒越多，千兆内网拷贝一次素材要等上大半天。于是决定从零搭一台能跑满万兆的机器，把选型、组装和系统部署完整记录下来。

![](/images/test-1.jpg)

![](/images/test-2.jpg)

机箱选了 8 盘位的塔式结构，前面板留出足够的风道，硬盘笼带减震垫。主板用带双 M.2 和 PCIe 4.0 x8 的型号，方便后续加装万兆网卡。

![](/images/test-3.jpg)

![](/images/test-4.jpg)

CPU 不用太强，低功耗的六核足够跑 Docker 和转码；内存直接上 32GB ECC，虚拟机和缓存都更从容。

![](/images/test-5.jpg)

![](/images/test-6.jpg)

硬盘统一用 8TB 企业盘，先做一次全盘坏道检测，再按 RAIDZ2 组池，容忍两块盘同时故障。

![](/images/test-7.jpg)

![](/images/test-8.jpg)

网卡是整机的关键，选了双口万兆电口卡，兼容现有交换机，不用额外换光模块。

![](/images/test-9.jpg)

![](/images/test-10.jpg)

交换机放在弱电箱旁，六类网线直接压接，走线全部套上理线管，避免和强电并行。

![](/images/test-1.jpg)

![](/images/test-2.jpg)

系统装在独立的 NVMe 上，数据盘不参与系统启动，重装系统时不会动到存储池。

![](/images/test-3.jpg)

![](/images/test-4.jpg)

存储池建好后先做一轮写入测试，确认顺序写入能稳定在 900MB/s 以上，再开始迁移数据。

![](/images/test-5.jpg)

![](/images/test-6.jpg)

共享协议开了 SMB 和 NFS，Windows、Mac 和播放器各取所需，权限按用户组划分。

![](/images/test-7.jpg)

![](/images/test-8.jpg)

Docker 里跑了相册、下载和备份三套服务，容器数据单独放在 appdata 目录，升级不丢配置。

![](/images/test-9.jpg)

![](/images/test-10.jpg)

相册服务开启人脸识别和地图索引，手机拍完自动同步，家里人也能按时间线翻看。

![](/images/test-1.jpg)

![](/images/test-2.jpg)

功耗实测待机 45W 左右，满载接近 120W，放在书房完全在可接受范围内。

![](/images/test-3.jpg)

![](/images/test-4.jpg)

散热用了两把 12cm 低速风扇，配合硬盘休眠，夜里几乎听不到声音。

![](/images/test-5.jpg)

![](/images/test-6.jpg)

安全方面关闭了默认管理员账号，开启两步验证，外网访问只走 WireGuard。

![](/images/test-7.jpg)

![](/images/test-8.jpg)

日常维护主要是看 SMART 和温度，设置了邮件告警，硬盘异常能第一时间知道。

![](/images/test-9.jpg)

![](/images/test-10.jpg)

整套下来成本可控，稳定性也经过了大半年考验。如果你也想搭一台，照着这个顺序来基本不会踩坑。

![](/images/test-1.jpg)

![](/images/test-2.jpg)
