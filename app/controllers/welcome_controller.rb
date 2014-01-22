class WelcomeController < ApplicationController
  skip_before_action :require_login, only: [:index, :about, :stack]
  def index
  end
  def about
  end
  def stack
  end
end
