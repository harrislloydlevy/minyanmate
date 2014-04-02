class MinyansController < ApplicationController
  skip_before_action :require_login, only: [:index, :show]
  before_action :confirm_owner
  skip_before_action :confirm_owner, only: [
                                          :new,
                                          :create,
                                          :index,
                                          :show,
                                          :star,
                                          :myminyans,
                                          :confirm_attend,
                                          :cancel_attend]

  def new # Blank to create new
    @minyan = Minyan.new
  end

  def index
    @minyans = Minyan.all
  end

  def myminyans
    @minyans = Minyan.where(owner: current_user)
    # Needed for the add new yid form hidden on the page
    @yid = Yid.new
  end

  def create # Submit of new to actuall create
    @minyan = Minyan.new(minyan_params)
    @minyan.owner = current_user

    if @minyan.save
      @minyan.star(current_user)
      respond_to do |format| 
        format.html { redirect_to my_minyans_path, notice: 'Created new minyan.'}
        format.json { head json: @minyan }
      end
    else
      flash.now[:error] = 'Could not create new Minyan.'
      respond_to do |format| 
        format.html { render action: 'new' }
        format.json { render json: @minyan.errors, status: :unprocessable_entity }
      end
    end
  end

  def show
    @minyan = Minyan.find(params[:id])
  end

  # Get object to fill edit screen
  def edit 
    @minyan = Minyan.find(params[:id])
  end

  # Make updates to object
  def update
    @minyan = Minyan.find(params[:id])
    if @minyan.update(minyan_params)
      respond_to do |format| 
        format.html { redirect_to my_minyans_path, notice: 'Updated minyan.'}
        format.json { head json: @minyan }
      end
    else
      respond_to do |format| 
        flash.now[:error] = 'Could not update Minyan'
        format.html { render 'minyans/edit' }
        format.json { render json: @minyan.errors, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @minyan = Minyan.find(params[:id])
    @minyan.destroy
     
    respond_to do |format|
      format.html {redirect_to minyans_path, notice: 'Deleted minyan.'}
    end
  end

  def star
    # This action toggles whether the user is a follower of this minyan
    @minyan = Minyan.find(params[:minyan_id])
    if @minyan.is_regular?(current_user) then
      @minyan.unstar(current_user)
    else
      @minyan.star(current_user)
    end

    @minyan.save!
    respond_to do |format|
      format.js { } # fallback. to star.js.haml
    end
  end

  private
    def minyan_params
      params.require(:minyan).permit(
        :title,
        :description,
        :sun,
        :mon,
        :tue,
        :wed,
        :thu,
        :fri,
        :sat)
    end

    def confirm_owner 
      @minyan = Minyan.find(params[:id])
      if current_user != @minyan.owner
        redirect_to root_path,
                  flash: {error: 'Not your Minyan to edit.'}
        return
      end
    end
end
