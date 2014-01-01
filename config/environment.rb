# Load the Rails application.
require File.expand_path('../application', __FILE__)

require 'yaml'  
APP_CONFIG = YAML.load(File.read(File.expand_path('../application.yml', __FILE__)))  
require 'rails/all'# Initialize the Rails application.
MinyanMate::Application.initialize!
