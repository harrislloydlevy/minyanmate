require 'test_helper'

class MinyansControllerTest < ActionController::TestCase
  setup do
    @minyan = minyans(:city)
    fake_login(yids(:omni_login_yid))
  end
  
  test "should get index" do
    get :index
    assert_response :success
    assert_not_nil assigns(:minyans)
  end

  test "should get new" do
    get :new
    assert_response :success
  end

  test "should create minyan" do
    assert_difference('Minyan.count') do
      post :create, minyan: {
          title: @minyan.title,
          description: @minyan.description,
          sun: @minyan.sun,
          mon: @minyan.mon,
          tue: @minyan.tue,
          wed: @minyan.wed,
          thu: @minyan.thu,
          fri: @minyan.fri,
          sat: @minyan.sat
        }
    end

    assert_redirected_to minyan_path(assigns(:minyan))
  end

  test "should show minyan" do
    get :show, id: @minyan
    assert_response :success
  end

  test "should get edit" do
    get :edit, id: @minyan
    assert_response :success
  end

  test "should update minyan" do
    patch :update, id: @minyan,
      minyan: {
          title: @minyan.title,
          description: @minyan.description,
          sun: @minyan.sun,
          mon: @minyan.mon,
          tue: @minyan.tue,
          wed: @minyan.wed,
          thu: @minyan.thu,
          fri: @minyan.fri,
          sat: @minyan.sat
        }
    assert_redirected_to minyan_path(assigns(:minyan))
  end

  test "should fail update minyan" do
    # Login as yid who does not own minyan
    fake_login(yids(:two))
    patch :update, id: @minyan,
      minyan: {
          title: @minyan.title,
          description: @minyan.description,
          sun: @minyan.sun,
          mon: @minyan.mon,
          tue: @minyan.tue,
          wed: @minyan.wed,
          thu: @minyan.thu,
          fri: @minyan.fri,
          sat: @minyan.sat
        }
    assert_redirected_to root_path()
  end

  test "should destroy minyan" do
    assert_difference('Minyan.count', -1) do
      delete :destroy, id: @minyan
    end

    assert_redirected_to minyans_path
  end

  test "should fail create" do
    @minyan = minyans(:invalid_recur)
    assert_no_difference('Minyan.count') do
      post :create, minyan: {
          title: @minyan.title,
          description: @minyan.description,
          sun: @minyan.sun,
          mon: @minyan.mon,
          tue: @minyan.tue,
          wed: @minyan.wed,
          thu: @minyan.thu,
          fri: @minyan.fri,
          sat: @minyan.sat
        }
    end
    assert_response :success
    
    @minyan = minyans(:invalid_title)
    assert_no_difference('Minyan.count') do
      post :create, minyan: {
          title: @minyan.title,
          description: @minyan.description,
          sun: @minyan.sun,
          mon: @minyan.mon,
          tue: @minyan.tue,
          wed: @minyan.wed,
          thu: @minyan.thu,
          fri: @minyan.fri,
          sat: @minyan.sat
        }
    end
    assert_response :success
  end

end
