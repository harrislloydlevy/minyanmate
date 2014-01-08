class MinyansController < ApplicationController
  skip_before_action :require_login, only: [:index, :show]
  before_action :confirm_owner
  skip_before_action :confirm_owner, only: [:index, :show, :confirm_attend, :cancel_attend]

  def new # Blank to create new
    @minyan = Minyan.new
  end

  def index
    @minyans = Minyan.all
  end

  def create # Submit of new to actuall create
    @minyan = Minyan.new(minyan_params)
    @minyan.owner = current_user
    if @minyan.save
      redirect_to @minyan
    else
      render 'new'
    end
  end

  def show
    @minyan = Minyan.find(params[:id])
  end

  # Get object to fill edit screen
  def edit 
    @minyan = Minyan.find(params[:id])
  end

  # Makre updates to object
  def update
    @minyan = Minyan.find(params[:id])
    if @minyan.update(minyan_params)
      redirect_to @minyan
    else
      render 'edit'
    end
  end

  def destroy
    @minyan = Minyan.find(params[:id])
    @minyan.destroy

    redirect_to minyans_path
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
        redirect_to minyans_path,
                  flash: {error: 'Not your Minyan to edit.'}
        return
      end
    end
end
