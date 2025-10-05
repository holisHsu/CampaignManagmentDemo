
build-images:
	docker-compose -f docker-compose.yml -f docker-compose.db.yml build


db-start:
	docker-compose -f docker-compose.db.yml up -d


migrate-db:
	docker-compose -f docker-compose.yml -f docker-compose.db.yml run --rm web python manage.py migrate


services-up:
	docker-compose -f docker-compose.yml -f docker-compose.db.yml up


services-up-detached:
	docker-compose -f docker-compose.yml -f docker-compose.db.yml up -d


services-down:
	docker-compose -f docker-compose.yml -f docker-compose.db.yml down


services-logs:
	docker-compose -f docker-compose.yml -f docker-compose.db.yml logs -f



# Clean up containers and volumes
services-clean:
	docker-compose -f docker-compose.yml -f docker-compose.db.yml down -v
	docker system prune -f


# Run backend tests with pytest
be-test:
	docker-compose -f docker-compose.yml -f docker-compose.db.yml run --rm web pytest


generate-requirements:
	cd backend && pip freeze > requirements.txt
