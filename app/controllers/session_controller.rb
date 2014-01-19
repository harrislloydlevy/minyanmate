class SessionController < ApplicationController
  skip_before_action :require_login, only: [:create]
  def create
    yid = Yid.from_omniauth(env["omniauth.auth"])
    # yid may have been udpated with new info from logging in so will
    # need to save

    if yid.save then
      session[:yid_id] = yid.id
      redirect_to request.env['omniauth.origin'] || '/',
        :notice => "Signed in!"
    else
      redirect_to request.env['omniauth.origin'] || '/',
        :flash => {:error => ["Could not login."] + yid.errors.full_messages}
    end
  end

  def destroy
    session[:yid_id] = nil
    redirect_to root_url, :notice => 'Signed Out!'
  end
end
