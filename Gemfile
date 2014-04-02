source 'http://rubygems.org'

# Bundle edge Rails instead: gem 'rails', github: 'rails/rails'
gem 'rails', '4.0.3'

# Use SCSS for stylesheets
gem 'sass-rails', '~> 4.0.0'

# Use Uglifier as compressor for JavaScript assets
gem 'uglifier', '>= 1.3.0'

# Use jquery as the JavaScript library
gem 'jquery-rails'

# Turbolinks makes following links in your web application faster. Read more: https://github.com/rails/turbolinks
# gem 'turbolinks'

# Build JSON APIs with ease. Read more: https://github.com/rails/jbuilder
gem 'jbuilder', '~> 1.2'

gem 'execjs'
gem 'therubyracer', :platforms => :ruby
gem 'turbolinks'

group :doc do
  # bundle exec rake doc:rails generates the API under doc/api.
  gem 'sdoc', require: false
end

gem 'omniauth'
gem 'omniauth-facebook'
gem 'omniauth-google-oauth2'
gem 'twitter-typeahead-rails', '= 0.9.3'

gem "bootstrap-sass"
gem "bootstrap_form"
gem "haml"
gem "html2haml"
gem "markdown"

# Use ActiveModel has_secure_password
# gem 'bcrypt-ruby', '~> 3.1.2'

# Use unicorn as the app server
# gem 'unicorn'

# Use Capistrano for deployment
# gem 'capistrano', group: :development

# Gem to manage config files
gem 'figaro' 

group :production do
  # Use Postgres during production for Heroku
  gem 'pg'

  # Heroku needs this gem for some asset handling
  gem 'rails_12factor'
end

group :development, :test do
  gem "simplecov"
  gem 'delorean' # To set time during tests
  gem 'debugger'
  gem 'awesome_print'
  gem 'single_test'
  gem 'sqlite3'
end


