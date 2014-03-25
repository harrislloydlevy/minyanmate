require 'date'
require 'awesome_print'
require 'simplecov'
SimpleCov.start 'rails'

# Set OmniAuth into test mode
OmniAuth.config.test_mode = true

# Set the user that you will log in as using OmniAuth
OmniAuth.config.mock_auth[:google] = OmniAuth::AuthHash.new({
  :provider => 'google',
  :uid => '123545',
  :credentials => {
    :token => "abcdef",
    :expires_at => (DateTime.now + 14).to_time},
  :info => {
    :email => 'from_omni@auth.org',
    :name => 'From Omni Auth' }
})

def fake_login(yid)
  session[:yid_id] = yid.id
end

ENV["RAILS_ENV"] ||= "test"
require File.expand_path('../../config/environment', __FILE__)
require 'rails/test_help'

class ActiveSupport::TestCase
  ActiveRecord::Migration.check_pending!

  # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
  #
  # Note: You'll currently still have to declare fixtures explicitly in integration tests
  # -- they do not yet inherit this setting
  fixtures :all

  # Add more helper methods to be used by all tests here...
  
  # Set the date to 1/1/2014 using delorean
  Delorean.time_travel_to Date.new(2014,1,1)
end
