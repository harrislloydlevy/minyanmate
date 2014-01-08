class ApplicationController < ActionController::Base
  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  protect_from_forgery with: :exception

  helper_method :current_user
  def current_user
    @current_yid ||= Yid.find_by_id(session[:yid_id]) if
      session[:yid_id]
  end

  before_action :require_login
  private
  def require_login
    unless current_user
      flash[:error] = 'You must be logged in for this action.'
      redirect_to minyans_path
    end
  end
end
