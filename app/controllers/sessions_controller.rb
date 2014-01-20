class SessionsController < ApplicationController
  skip_before_action :require_login, only: [:login]

  def login
    yid = Yid.from_omniauth(request.env['omniauth.auth'])
    # yid may have been udpated with new info from logging in so will
    # need to save

    logger.ap yid

    if yid.save then
      logger.debug "Save succeeded"
      session[:yid_id] = yid.id
      redirect_to request.env['omniauth.origin'] || '/',
        :notice => "Signed in!"
    else
      logger.debug "Save failed"
      logger.ap yid.errors
      redirect_to request.env['omniauth.origin'] || '/',
        :flash => {:error => ["Could not login."] + yid.errors.full_messages}
    end
  end

  def logout
    session[:yid_id] = nil
    redirect_to root_url, :notice => 'Signed Out!'
  end
end
