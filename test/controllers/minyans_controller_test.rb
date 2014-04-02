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

    assert_redirected_to my_minyans_path
    assert_not_nil flash[:notice]
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

    assert_redirected_to my_minyans_path
    assert_not_nil flash[:notice]
    assert_nil flash[:error]
  end

  test "should fail update" do
    patch :update, id: @minyan,
      minyan: {
          title: @minyan.title,
          description: @minyan.description,
          sun: false,
          mon: false,
          tue: false,
          wed: false,
          thu: false,
          fri: false,
          sat: false
        }
    assert_template("edit")
  end

  test "star_minyan" do
    yid = yids(:one)

    assert_difference('Regular.count') do
      # Test first star adds as regular
      post :star, minyan_id: @minyan.id, format: :js
      assert_response(:success)
    end

    assert_difference('Regular.count', -1) do
    # Test second start removes
    post :star, minyan_id: @minyan.id, format: :js
    assert_response(:success)
    end
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

  test "my minyans" do
    fake_login(yids(:two))
    post :myminyans
    assert_response(:success)
  end

  test "should destroy minyan" do
    assert_difference('Minyan.count', -1) do
      delete :destroy, id: @minyan
    end

    assert_redirected_to minyans_path
    assert_not_nil flash[:notice]
    assert_nil flash[:error]
  end

  test "should fail create" do
    @minyan = minyans(:izzy)
    assert_no_difference('Minyan.count') do
      post :create, minyan: {
          title: @minyan.title,
          description: @minyan.description,
          sun: false,
          mon: false,
          tue: false,
          wed: false,
          thu: false,
          fri: false,
          sat: false
        }
    end
    assert_response :success
    assert_not_nil flash[:error]
    
    @minyan = minyans(:izzy)
    assert_no_difference('Minyan.count') do
      post :create, minyan: {
          title: "",
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
    assert_not_nil flash[:error]
  end
end
