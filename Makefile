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

# الشبكات المفعّلة (افتراضياً mysterium,storj)
ENABLED_NETWORKS ?= 

# حوّل "mysterium,storj" إلى "--profile mysterium --profile storj"
comma := ,
space := $(empty) $(empty)
NETWORK_LIST := $(subst $(comma),$(space),$(ENABLED_NETWORKS))
PROFILE_FLAGS := $(foreach n,$(NETWORK_LIST),--profile $(n))

COMPOSE := docker compose $(PROFILE_FLAGS)

.PHONY: help up down restart logs ps pull config networks

help:
	@echo "NodePIN — available commands:"
	@echo "  make up       Start enabled networks: $(ENABLED_NETWORKS)"
	@echo "  make down     Stop everything"
	@echo "  make restart  Restart the stack"
	@echo "  make logs     Follow logs"
	@echo "  make ps       Show container status"
	@echo "  make pull     Pull latest images"
	@echo "  make config   Validate compose configuration"
	@echo "  make networks Show which networks are enabled"

networks:
	@echo "Enabled networks: $(ENABLED_NETWORKS)"
	@echo "Profile flags:    $(PROFILE_FLAGS)"

up:
	@echo "▶ Starting NodePIN with networks: $(ENABLED_NETWORKS)"
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
