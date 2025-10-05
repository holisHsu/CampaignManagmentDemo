
# Campaigns Management Project Demo

## 🟢 Quick Browse

- Project have been deployed to [Heroku Hosted Site](https://campaign-management-demo-871f17e7f4bd.herokuapp.com)

- Account / Password is `admin / admin`

- After login, you can take a look at [API Online Documentation](https://campaign-management-demo-871f17e7f4bd.herokuapp.com/api_doc/), `You can also try out API here` (If you get 403 when send request to API, please check your login status)

## 🟢 Architecture and Software Stack

- A Docker Container Wrap all things up
    - [DB compose file](docker-compose.db.yml)
    - [App compose file](docker-compose.yml)
    - [Dockerfile](Dockerfile)
        - Build FE React App
        - Install Nginx
            - [nginx.conf](nginx/nginx.conf)
        - Compile static files for Django admin
        - Run Django Backend by `uvicorn` (python web server)
        - `Run Nginx and Serve Following Content`
            - React App
            - Django Backend
                - API
                - static files for admin site

### 🔹 Django as Backend

Use Django instead of Flask (other light weight framework),
because it already integrate some functionality I need.

- Database migration system support
- User model and buildin middleware for session login

### 🔹 React as Frontend, with TypeScript

Just for demo Frontend skillset

## 🟢 How to run

1. `make build-images`
2. `make db-start`
    > DB would start and detached to background
3. `make migrate-db`
    > 1. Default Admin User will be migrated
    > 2. Campaign and LineItem data will be migrated
4. `make services-up`
    > - Run Nginx to serve App
    > - You can go to `http://localhost` to check

- Run BE test by `make be-test`

- Clear everything include images: `make services-clean`

- If you want to detach App Backgroun 
    - `make services-up-detached`
    - log `make services-logs`

## 🟢 Features Go Through

### 🔹 Data Model

- [Django Model File](backend/placements_io/models.py)
    - For detail please take a look at comments in file

### 🔹 Data Migration
- [Default Admin User](backend/placements_io/migrations/0001_default_admin_user.py)
- [Default Campaings / LineItems](backend/placements_io/migrations/0003_seed_sample_data.py)
    - Comments in migraiton file describe detail of implementation

### 🔹 Login / Logout

- BE: [View file](backend/placements_io/views.py) , LoginView, LogoutView
    - driven by Django Session Middleware and Auth support
- FE: [AuthProvider](frontend/src/contexts/AuthContext.tsx) to provide auth context to child node
    - Every access to Protected Page without login will be redriected to login page
    - After login, user will be directed back

### 🔹 Home Page (List Campaigns)

- BE: [View File](backend/placements_io/views.py), CampaignListView
    - Pagination (by Django Restful Framework)
    - ORM N+1 query issue is prevented
- FE: [Home File](frontend/src/components/Home.tsx)
    - `?page=$NUM` allow you to jump any page you want (you should go to page 2 so the query string shown in URL)
    - Page overflow access by query string is prevented
    - Campaign with budget under / over used is `highlight`

### 🔹 Campaign Detail Page

- BE: [View File](backend/placements_io/views.py), CampaignDetailView, LineItemPatchView
- FE: 
    - [Campaign Detail File](frontend/src/components/CampaignDetail.tsx)
        - LineItem with budget under / over used is `highlight`
    - [Edit LineItem Modal](frontend/src/components/EditLineItemModal.tsx)

### 🔹 Download CSV

- BE: [View File](backend/placements_io/views.py), CampaignListCSVDownloadView, LineItemListCSVDownloadView
    - CSV binary in response with appointed content type
- FE: 
    - [Home Page](frontend/src/components/Home.tsx), handleCsvDownload
    - [Campaign Detail File](frontend/src/components/CampaignDetail.tsx), handleLineItemCsvDownload
        - Take BLOB from Reponse and trigger browser download

## 🟢 AI Collaboration Exposure

- All of tis README is written by myself
- Most of BE content is written by myself
- Most of BE API doc is written by LLM Agent (Seriliazer is written by myself)
- Most of FE content is written by LLM Agent
- All CSS style content is written by LLM Agent
