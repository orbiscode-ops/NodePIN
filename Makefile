# ═══════════════════════════════════════════
# NodePIN — Makefile wrapper
#
# يقرأ ENABLED_NETWORKS من .env ويحوّلها تلقائياً إلى --profile لـ docker compose.
# فقط الشبكات المذكورة في ENABLED_NETWORKS هي التي تعمل.
#
# الأوامر:
#   make up      → تشغيل الشبكات المختارة (+ اللوحة و watchtower)
#   make down    → إيقاف كل شيء
#   make restart → إعادة تشغيل
#   make logs    → عرض السجلات
#   make ps      → حالة الحاويات
#   make pull    → تحديث الصور
#   make config  → التحقق من صحة الإعداد
# ═══════════════════════════════════════════

# حمّل متغيرات .env إن وجد
ifneq (,$(wildcard .env))
include .env
export
endif

# Auto-detect profiles based on configured environment variables in .env
PROFILE_FLAGS :=
ifneq ($(strip $(STORJ_WALLET)),)
  PROFILE_FLAGS += --profile storj
endif
ifneq ($(strip $(TRAFFMONETIZER_TOKEN)),)
  PROFILE_FLAGS += --profile traffmonetizer
endif
ifneq ($(strip $(PROXYRACK_API_KEY)),)
  PROFILE_FLAGS += --profile proxyrack
endif
ifneq ($(strip $(ANYONE_WALLET)),)
  PROFILE_FLAGS += --profile anyone
endif
ifneq ($(strip $(NYM_NODE_ID)),)
  PROFILE_FLAGS += --profile nym
endif
ifneq ($(strip $(NKN_BENEFICIARY_ADDR)),)
  PROFILE_FLAGS += --profile nkn
endif
ifneq ($(strip $(NODEPIN_DOMAIN)),)
  PROFILE_FLAGS += --profile https
endif
ifneq ($(strip $(PROFILE_FLAGS)),)
  PROFILE_FLAGS += --profile watchtower
endif

COMPOSE := docker compose $(PROFILE_FLAGS)

.PHONY: help up down restart logs ps pull config networks

help:
	@echo "NodePIN — available commands:"
	@echo "  make up       Start configured networks"
	@echo "  make down     Stop everything"
	@echo "  make restart  Restart the stack"
	@echo "  make logs     Follow logs"
	@echo "  make ps       Show container status"
	@echo "  make pull     Pull latest images"
	@echo "  make config   Validate compose configuration"
	@echo "  make networks Show active profile flags"

networks:
	@echo "Active profiles: $(PROFILE_FLAGS)"

up:
	@echo "▶ Starting NodePIN with profiles: $(PROFILE_FLAGS)"
	$(COMPOSE) up -d
	@echo "✔ NodePIN is up. Dashboard: http://$(NODEPIN_VPS_IP):$(or $(DASHBOARD_PORT),3000)"

down:
	$(COMPOSE) down

restart: down up

logs:
	$(COMPOSE) logs -f --tail=100

ps:
	$(COMPOSE) ps

pull:
	$(COMPOSE) pull

config:
	$(COMPOSE) config
