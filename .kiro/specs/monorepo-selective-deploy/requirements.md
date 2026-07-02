# وثيقة المتطلبات — monorepo-selective-deploy

## Introduction

يهدف هذا الطلب إلى إعادة هيكلة مشروع **NodeYield** كـ Monorepo يتيح معاملة كل شبكة لامركزية (Mysterium، Storj، PacketStream، وما سيُضاف لاحقاً) بوصفها **وحدة مستقلة قابلة للنشر بشكل منفرد**. كما يشمل الطلب إنشاء pipeline لـ GitHub Actions يُمكّن المطور من اختيار أي شبكة أو مجموعة شبكات لنشرها على VPS دون إعادة نشر الكل، مع ضمان الاتساق في إضافة الشبكات وحذفها بأقل جهد ممكن.

الحالة الراهنة التي يُعالجها هذا الطلب:
- ملف `docker-compose.yml` موحد يخلط كل الخدمات.
- لا يوجد CI/CD مكتمل.
- لا يوجد معيار موحّد لكيفية هيكلة كل شبكة كوحدة مستقلة.

---

## قاموس المصطلحات

- **Monorepo**: مستودع Git واحد يحتوي على وحدات متعددة مستقلة يمكن تطويرها ونشرها بصورة منفصلة.
- **Network_Module**: وحدة الشبكة — مجلد مستقل تحت `services/` يمثل شبكة لامركزية واحدة ويحتوي على جميع مكوناتها (compose، Dockerfile، توثيق، إعدادات).
- **Selective_Deploy_Pipeline**: سير عمل GitHub Actions الذي يسمح للمطور باختيار الشبكات المراد نشرها يدوياً أو تلقائياً عند تغيير الملفات.
- **Deploy_Orchestrator**: نظام GitHub Actions المسؤول عن تنسيق عملية البناء والنشر للشبكات المحددة.
- **CI_CD_System**: منظومة التكامل والتسليم المستمرين المبنية على GitHub Actions.
- **VPS**: الخادم الافتراضي الخاص (netcup) الذي تُنشر عليه الحاويات.
- **Registry**: سجل صور Docker (GitHub Container Registry أو Docker Hub).
- **Compose_Module**: ملف `docker-compose.yml` الخاص بكل Network_Module.
- **Module_Template**: القالب الموحّد الذي يجب على كل Network_Module الالتزام به.
- **Change_Detection**: آلية اكتشاف الملفات المتغيرة في pull request أو push لتحديد أي شبكات تأثرت.

---

## Requirements

### Requirement 1

**User Story:** As a NodeYield developer, I want each network to have an independent folder with a consistent structure, so that I can develop and maintain any network without affecting the others.

#### Acceptance Criteria

1. THE **Monorepo** SHALL organize networks such that each network resides in its own folder under `services/{network-name}/`.
2. THE **Module_Template** SHALL require every Network_Module to contain at minimum the following files: `docker-compose.yml`, `README.md`, and `.env.example`.
3. WHEN a new Network_Module is added, THE **Monorepo** SHALL accept it without modifying any files belonging to other networks.
4. WHEN a Network_Module is removed, THE **Monorepo** SHALL remain consistent and buildable without errors in the remaining networks.
5. THE **Monorepo** SHALL retain a root-level `docker-compose.yml` that functions as an optional override for full local all-in-one execution.
6. WHERE a network uses a custom Docker image, THE **Network_Module** SHALL contain a dedicated `Dockerfile` for that network.

---

### Requirement 2

**User Story:** As a NodeYield developer, I want to choose which network (or set of networks) to deploy to VPS via GitHub Actions, so that I do not redeploy all services when only one network changes.

#### Acceptance Criteria

1. THE **Selective_Deploy_Pipeline** SHALL provide a `workflow_dispatch` trigger in GitHub Actions that lets the developer select target networks before running the workflow.
2. WHEN the developer triggers `workflow_dispatch`, THE **Selective_Deploy_Pipeline** SHALL accept a comma-separated list of network names as input (example: `mysterium,storj`).
3. WHEN the developer does not specify any network in `workflow_dispatch`, THE **Selective_Deploy_Pipeline** SHALL reject execution and display a clear error message.
4. THE **Deploy_Orchestrator** SHALL deploy only the specified networks without stopping or restarting any unspecified networks.
5. WHEN the Deploy_Orchestrator completes deployment of a network, THE **CI_CD_System** SHALL log the deployment result (success or failure) for each network independently in GitHub Actions logs.
6. IF deployment of one specified network fails, THEN THE **Deploy_Orchestrator** SHALL continue deploying the remaining specified networks and not halt due to that failure.
7. THE **Deploy_Orchestrator** SHALL execute each specified network's deployment on VPS via SSH by running the appropriate commands (`docker compose pull && docker compose up -d`) inside the target network's directory.

---

### Requirement 3

**User Story:** As a NodeYield developer, I want GitHub Actions to automatically detect which networks changed on push to `main`, so that I do not need to specify networks manually every time.

#### Acceptance Criteria

1. WHEN a commit is pushed to the `main` branch, THE **Change_Detection** SHALL inspect changed files and identify which Network_Modules were affected based on file paths within `services/{network-name}/`.
2. WHEN only files belonging to a specific network change, THE **Selective_Deploy_Pipeline** SHALL automatically deploy that network only, without manual intervention.
3. WHEN shared files outside network folders change (such as the root `docker-compose.yml` or `.github/`), THE **Deploy_Orchestrator** SHALL notify the developer via a workflow summary or annotation that the changes are shared and require manual review.
4. THE **Change_Detection** SHALL distinguish between documentation-only changes (such as `README.md`) and code or configuration changes; IF only documentation changes are detected, THEN THE **Selective_Deploy_Pipeline** SHALL skip the deployment step.

---

### Requirement 4

**User Story:** As a NodeYield developer, I want Docker images for the specified networks to be built and pushed to the Registry automatically, so that the VPS is always running the latest version.

#### Acceptance Criteria

1. WHEN a specified network contains a `Dockerfile`, THE **CI_CD_System** SHALL build the custom image and push it to the Registry using a tag that includes the network name and commit SHA (`{network}:{sha}`).
2. WHEN a specified network does not contain a `Dockerfile` (uses a prebuilt image), THE **CI_CD_System** SHALL skip the build step and proceed directly to the deploy step.
3. THE **CI_CD_System** SHALL use pre-configured GitHub Secrets exclusively for Registry authentication and for VPS SSH access.
4. IF building the image for a network fails, THEN THE **CI_CD_System** SHALL abort deployment for that specific network and log the failure without affecting the build or deployment of other networks.

---

### Requirement 5

**User Story:** As a NodeYield developer, I want adding or removing a network to follow a standardized and documented process, so that any contributor can do it easily and consistently.

#### Acceptance Criteria

1. THE **Module_Template** SHALL provide a script or documented instructions that enable a developer to create a new Network_Module in no more than three steps.
2. WHEN a new Network_Module is added following the Module_Template, THE **Selective_Deploy_Pipeline** SHALL automatically discover it among the available networks for deployment.
3. WHEN a Network_Module folder is removed from the repository, THE **Selective_Deploy_Pipeline** SHALL remove it from the available network list without requiring manual edits to workflow files.
4. THE **Monorepo** SHALL provide a `CONTRIBUTING.md` file or a dedicated section in the root `README.md` that precisely explains how to add a new network and how to remove one.

---

### Requirement 6

**User Story:** As a NodeYield infrastructure operator, I want all sensitive data (SSH keys, Registry credentials, network configurations) to remain secure and never exposed in GitHub Actions logs or source code.

#### Acceptance Criteria

1. THE **CI_CD_System** SHALL use GitHub Secrets exclusively to store VPS SSH credentials (private key, IP address, and username).
2. THE **CI_CD_System** SHALL use GitHub Secrets exclusively to store Registry authentication credentials (username and access token).
3. THE **Monorepo** SHALL contain no real `.env` file committed to Git, and SHALL provide an `.env.example` file for each Network_Module containing only variable names without their values.
4. IF a GitHub Actions log exposes a Secret value in plain text, THEN THE **CI_CD_System** SHALL be considered to have a security defect requiring review.
