require 'test_helper'

class SessionsControllerTest < ActionController::TestCase
  test "should login new user" do
    assert_difference('Yid.count') do
      request.env['omniauth.auth'] = OmniAuth.config.mock_auth[:google]
      post :login, provider: :google
      # Code in test_helper has setup ominiauth to return generic new user name
      # "Omni Auth"
      assert_response :redirect
      assert_equal "Signed in!", flash[:notice]

      yid = Yid.find(session[:yid_id])
      assert yid.name == OmniAuth.config.mock_auth[:google].info.name
    end
  end

  test "should logout" do
    request.env['omniauth.auth'] = OmniAuth.config.mock_auth[:google]
    post :login, provider: :google
    assert_not_nil session[:yid_id]

    post :logout
    assert_nil session[:yid_id]
  end

  test "should login to existing" do
    new_email = "updated@from.omni"
    assert_no_difference('Yid.count') do
      OmniAuth.config.add_mock(:google, {
        :uid => yids(:omni_login_yid).uid,
        :info => {:email => new_email},
        :credentials => {
          :token => "abcdef",
          :expires_at => (DateTime.now + 14).to_time}})
      request.env['omniauth.auth'] = OmniAuth.config.mock_auth[:google]

      post :login, provider: :google
      assert_response :redirect
      assert_equal "Signed in!", flash[:notice]
    end

    # Check that the email of the user gets updated
    yid = Yid.find(yids(:omni_login_yid).id)
    assert_equal yid.email, new_email
  end
end
