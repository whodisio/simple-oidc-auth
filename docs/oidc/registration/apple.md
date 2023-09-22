# setup.apple

ref
- https://developer.apple.com/sign-in-with-apple/
- https://developer.apple.com/sign-in-with-apple/get-started/
- https://developer.apple.com/help/account/configure-app-capabilities/configure-sign-in-with-apple-for-the-web/
- https://techdocs.akamai.com/identity-cloud/docs/the-sign-in-with-apple-social-login-configuration-guide

### 0. Enroll in Apple Developer Program

0.1. open the enrollment page: https://developer.apple.com/programs/enroll/
  - note: you'll need a legal entity in order to enroll with apple as an organization
0.2. find or create your duns number, if enrolling as an organization: https://developer.apple.com/support/D-U-N-S/
  - the link will allow you to search for your existing duns number
  - if you do not already have one, you will be offered to create one (can take at least 7 days)
  - if you already have one but dont remember it, apple will offer to email you it after finding it
0.3. follow the enrollment prompts at: https://developer.apple.com/enroll/


### 1. Get your App ID, Service ID, and Private Key

ref
- https://developer.apple.com/help/account/configure-app-capabilities/create-a-sign-in-with-apple-private-key
- https://developer.apple.com/help/account/configure-app-capabilities/about-sign-in-with-apple

1.1. find or create an `App Id`:
  - if you have an existing `App Id` for this application, use it: https://developer.apple.com/account/resources/identifiers/list
  - if you do not, create one
    - open the add identifiers screen: https://developer.apple.com/account/resources/identifiers/add/bundleId
    - select "App IDs" as the type of id to register
    - select "App" as the type
    - define a "description" and explicit "bundleId" for your app
    - select "Signin With Apple" as one of the services
    - press "register"
    - your `App Id` is the bundle id you have defined
1.2. create a `Service Id` for your website
  - if you have an existing `Service Id` for this website, use it: https://developer.apple.com/account/resources/identifiers/list/serviceId
  - if you do not, create one
    - open the add identifiers screen: https://developer.apple.com/account/resources/identifiers/add/bundleId
    - select "Service Ids" as the type of id to register
    - define a description and bundle identifier
      - note, the "Description" you use here will be displayed on the Oidc Signin Page
      - `Use your Apple Id to sign in to ${description}`
    - press "register"
    - open your new "Service Id" again
    - enable "Siginin with Apple" by pressing the checkbox
    - press "configure"
    - specify the `App Id` that you created in the previous step as the `Primary App Id` for this `Service Id`
    - specify all of the website domains from which you will be making oidc auth requests
      - for example
        - www.yoursite.com
        - www.yoursite.dev
        - localhost.yoursite.com
        - localhost.yoursite.dev
    - specify all of the return urls which your oidc auth requests will set as the redirect uri
      - for example
        - https://auth.yoursite.com/oidc/apple/redirect
        - https://auth.yoursite.dev/oidc/apple/redirect
    - save
    - your `Service Id` is the bundle id you have defined
1.3. create a `Private Key` for your application
  - if you have an existing `Private Key` for this `App Id`, feel free to use it: https://developer.apple.com/account/resources/authkeys/list
  - if you do not, create one
    - open the register new key screen: https://developer.apple.com/account/resources/authkeys/add
    - define a name for the key
    - enable the "signin with apple" checkbox
    - press "configure" next to "signin with apple"
    - choose the "primary app id" of the app created in the steps above
    - press save
    - press continue
    - press register
    - download your key (⚠️ it can only be downloaded once, so save it securely)
