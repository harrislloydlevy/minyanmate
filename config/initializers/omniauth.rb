Rails.application.config.middleware.use OmniAuth::Builder do
  provider :google_oauth2,
    APP_CONFIG['OAUTH_CLIENT_ID'],
    APP_CONFIG['OAUTH_CLIENT_SECRET'],
    { name: 'google_login',
      scope: 'userinfo.email,userinfo.profile',
      approval_prompt: '' }
     
end
