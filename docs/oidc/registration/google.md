# setup.google

ref:
- https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid

### 0. Open a Google Cloud Developers project

0.1. open the console https://console.developers.google.com/apis
0.2. create a project or choose an existing project to add signup under

### 1. Configure OAuth Consent Screen

ref:
- https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid#configure_your_oauth_consent_screen

1.1. open configuration: https://console.cloud.google.com/apis/credentials/consent
1.2. assert you are operating within your desired google project (top left)
1.3. fill out the user displayed consent screen information
  - user type = internal | external
  - app name = name displayed to users on signin
  - app logo = logo displayed to users on signin
  - urls
    - homepage
    - privacypolicy
    - termsandconditions
  - contact = support email to contact
  - domains
1.4. fill out the auth scopes
  - .../auth/userinfo.email - See your primary Google Account email address
  - .../auth/userinfo.profile - See your personal info, including any personal info you've made publicly available
1.5. add test users
  - any email you want to enable signing in while app is under review


### 2. Get your Google API client ID

ref:
- https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid#get_your_google_api_client_id

2.1. open credentials: https://console.developers.google.com/apis/credentials
2.2. assert you are operating within your desired google project (top left)
2.3. press `Create credentials > OAuth client ID`
   - to create a new id: `Application type` = `Web application`
   - to use existing id: choose one of type `Web application`
2.4. add your domains to `Authorized JavaScript origins`
   - add your production domain
      - e.g., `https://www.example.com`
   - add your development domains
      - e.g., `https://www.example.dev`
      - e.g., `https://localhost.example.dev:3443`
      - e.g., `http://localhost:3000`
2.5. save your client id and secret

### 3. Verify your application

ref: https://support.google.com/cloud/answer/9110914#zippy=%2Csteps-to-prepare-for-verification%2Csteps-to-submit-your-app

3.1. open oauth consent screen: https://console.cloud.google.com/apis/credentials/consent
3.2. assert you are operating within your desired google project (top left)
3.3. press `Publish App` button & confirm
3.4. press `Prepare for Verification` button & confirm
3.5. wait 3-5 days for a first email from the verification team
