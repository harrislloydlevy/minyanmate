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

  test "suggest yids" do
    fake_login(@yid)
    @event = events(:one)
    # Note: Fixtures have set up yids one and two to be at this event - so only
    # the omni_auth_login yid should be left.
    post :suggest, q: "omni", event: @event, format: :json

    assert_response(:success)
    result = JSON.parse(response.body)

    # Will need to make this test more intelligent if I add more test yids in case
    # there are any other yids that should show up.
    assert_equal result[0]["id"], yids(:omni_login_yid).id

    # Now to check that if we remove add the omni_log yid and remove yid one
    # then yid one shows up in suggestions.
    @event.yid_ids.delete(yids(:one).id)
    @event.yid_ids << (yids(:omni_login_yid).id)
    @event.save!

    post :suggest, q: "One", event: @event, format: :json
    assert_response(:success)
    result = JSON.parse(response.body)
    assert_equal result[0]["id"], yids(:one).id

  end

  test "update yid" do
    @yid = yids(:omni_login_yid)
    # Fake login as the user first.
    fake_login(@yid)
    post :update, id: @yid, yid: { email: @yid.email, name: @yid.name, phone: @yid.phone }
    assert_redirected_to yid_path(assigns(:yid))
  end

  test "fail update yid" do
    bad_email="12345"

    @yid = yids(:omni_login_yid)
    # Fake login as the user first.
    fake_login(@yid)
    post :update, id: @yid, yid: { email: bad_email, name: @yid.name, phone: @yid.phone }
    assert_response :success
    assert_not_blank, flash[:error]
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
