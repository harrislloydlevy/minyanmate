require 'test_helper'

class YidsControllerTest < ActionController::TestCase
  setup do
    @yid = yids(:one)
  end
 
  test "should require login" do
    @yid = yids(:omni_login_yid)
    post :update, id: @yid, yid: { email: @yid.email, name: @yid.name, phone: @yid.phone }
    assert_redirected_to root_path()

    # Now try logged in as someone else
    fake_login(yids(:two))
    @yid = yids(:omni_login_yid)
    post :update, id: @yid, yid: { email: @yid.email, name: @yid.name, phone: @yid.phone }
    assert_redirected_to yids_path()
  end

  test "update yid" do
    @yid = yids(:omni_login_yid)
    # Fake login as the user first.
    fake_login(@yid)
    post :update, id: @yid, yid: { email: @yid.email, name: @yid.name, phone: @yid.phone }
    assert_redirected_to yid_path(assigns(:yid))
  end

  test "should get index" do
    get :index
    assert_response :success
    assert_not_nil assigns(:yids)
  end

  test "should show yid" do
    get :show, id: @yid
    assert_response :success
  end

  test "should get edit" do
    fake_login(@yid)
    get :edit, id: @yid
    assert_response :success
  end

  test "should destroy yid" do
    fake_login(@yid)
    assert_difference('Yid.count', -1) do
      delete :destroy, id: @yid
    end

    assert_redirected_to yids_path
  end

  test "should not destroy yid" do
    # Login as a different user
    fake_login(yids(:two))

    assert_no_difference('Yid.count', -1) do
      delete :destroy, id: yids(:one)
    end

    assert_redirected_to yids_path
  end

end
