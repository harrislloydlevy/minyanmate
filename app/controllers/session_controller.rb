class SessionController < ApplicationController
  def create
    yid = Yid.from_omniauth(env["omniauth.auth"])

    session[:yid_id] = yid.id

    redirect_to request.env['omniauth.origin'] || '/', :notice => "Signed in!"
end

  def destroy
    session[:yid_id] = nil
    redirect_to root_url, :notice => 'Signed Out!'
  end
end
