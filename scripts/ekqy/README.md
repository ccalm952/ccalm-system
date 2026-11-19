# e看牙患者导入

把 e看牙 中某个患者的初诊/复诊病历、治疗计划、复诊关联、收费与收款导入 **CCALM API**（写入服务器数据库，本机脚本不再直连库）。

## 架构

1. **抓取（本机）**：`scrape.mjs` 用 ego-browser 登录态从 e看牙抓成 `.raw.json`
2. **写入（服务器）**：`POST /api/patients/ekqy-import`（权限 `patient.import_ekqy`），在事务里清空该患者已有病历/收费后重写
3. **网页**：患者列表 →「导入 e看牙」→ 上传 `.raw.json` → 预览 → 确认

## 前提

1. 本机 e看牙浏览器已登录（ego-browser 的 `e看牙导入` 空间）
2. 线上/本地 API 已部署含本功能的版本
3. 当前账号角色具备 `patient.import_ekqy`（内置管理员迁移后已有）
4. 脚本调用 API 时需要 JWT：
   - 环境变量 `EKQY_TOKEN`，或
   - 文件 `scripts/ekqy/.token.txt`（浏览器登录后 `localStorage.auth:token`）

可选：`EKQY_API_BASE`（默认 `https://www.ccalm.xyz/api`；打本地可设 `http://127.0.0.1:3000/api`）

## 使用

### 网页

患者页工具栏「导入 e看牙」→ 选择 `.raw.json` → 预览 → 确认导入。

### 命令行（抓取 + 导入）

```powershell
# 先写入 token（一次即可）
Set-Content scripts/ekqy/.token.txt "你的JWT"

.\scripts\ekqy\import-patient.ps1 "柯文雄"
.\scripts\ekqy\import-patient.ps1 "柯文雄" -DryRun
.\scripts\ekqy\import-patient.ps1 "张三" -ChartNo "病历号"
.\scripts\ekqy\import-patient.ps1 "柯文雄" -ApiBase "http://127.0.0.1:3000/api"
```

也可只抓取后用网页导入，或：

```powershell
ego-browser nodejs -e "await import('file:///C:/Users/ccalm/Desktop/ccalm-system/scripts/ekqy/scrape.mjs')"
# 再在患者页上传 scripts/ekqy/.raw.json
```

## 导入内容

- 患者基本信息（姓名、手机、病历号、性别、生日）
- 每次就诊 `PatientVisit`
- 初诊/复诊 `MedicalRecord`
- 检查、诊断、处置、医嘱、备注
- 初诊治疗计划 `TreatmentPlanItem`
- 复诊与治疗计划的关联 `PlanItemFollowUp`
  - 优先按牙位/文本匹配；
  - 无牙位信息时（如正畸）关联到第一条计划
- 收费：合并成一张初诊治疗收费单，含明细和多笔收款

## 说明

- 同一患者重复导入时，会先清空该患者已有的病历和收费，再重新写入（事务内完成）
- `dryRun: true` 只返回将匹配/清空/写入的统计，不落库
- 就诊记录会复用同日期同时段的已有记录；同日期已有「待写病历」的就诊会直接复用并补上时间
- 牙位使用 e看牙 的 FDI 编码，直接写入
- 治疗计划单价不单独抓取，收费金额以收费单为准
- 请确认有权限导出这些患者数据
