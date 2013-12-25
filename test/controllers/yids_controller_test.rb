require 'test_helper'

class YidsControllerTest < ActionController::TestCase
  setup do
    @yid = yids(:one)
  end

  test "should get index" do
    get :index
    assert_response :success
    assert_not_nil assigns(:yids)
  end

  test "should get new" do
    get :new
    assert_response :success
  end

  test "should create yid" do
    assert_difference('Yid.count') do
      post :create, yid: { email: @yid.email, name: @yid.name, phone: @yid.phone }
    end

    assert_redirected_to yid_path(assigns(:yid))
  end

  test "should show yid" do
    get :show, id: @yid
    assert_response :success
  end

  test "should get edit" do
    get :edit, id: @yid
    assert_response :success
  end

  test "should update yid" do
    patch :update, id: @yid, yid: { email: @yid.email, name: @yid.name, phone: @yid.phone }
    assert_redirected_to yid_path(assigns(:yid))
  end

  test "should destroy yid" do
    assert_difference('Yid.count', -1) do
      delete :destroy, id: @yid
    end

    assert_redirected_to yids_path
  end
end
