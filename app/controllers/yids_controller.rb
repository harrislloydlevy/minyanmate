class YidsController < ApplicationController
  before_action :set_yid, only: [:show, :edit, :update, :destroy]
  before_action :require_login, except: [:index, :show, :fake_login]
  before_action :is_current_user, except: [:index, :suggest, :show, :fake_login]
  before_action :is_dev, only: [:fake_login]

  # GET /yids
  # GET /yids.json
  def index
    @yids = Yid.all
  end

  # GET /yid_suggest
  # GET /yid_suggest.json
  def suggest
    already_attending = Event.find(params[:event]).yid_ids
    # Search for everything based on name, email and phone
    # Exclude those already attending minyan.
    # Note that includes the final array as text without SQL quoting is fine as
    # user cannot manipulate those IDs which are guaranteed to be integers only.
    @yids = Yid.where(
              "(name like :q OR email like :q OR phone like :q) AND " +
              "id not in (" + already_attending.join(",") + ")",
              {q: "%" + params[:q] + "%"})
  end

  # GET /yids/1
  # GET /yids/1.json
  def show
  end

  # GET /yids/1/edit
  def edit
  end

  # PATCH/PUT /yids/1
  # PATCH/PUT /yids/1.json
  def update
    respond_to do |format|
      if @yid.update(yid_params)
        format.html { redirect_to @yid, notice: 'Yid was successfully updated.' }
        format.json { head :no_content }
      else
        flash.now[:error] = 'Yid was not updated'
        format.html { render action: 'edit'}
        format.json { render json: @yid.errors, status: :unprocessable_entity }
      end
    end
  end

  # Only used in dev. Precondition blocks in prodcution
  def fake_login
    session[:yid_id] = params[:yid_id]
    redirect_to yids_url
  end

  # DELETE /yids/1
  # DELETE /yids/1.json
  def destroy
    @yid.destroy
    respond_to do |format|
      format.html { redirect_to yids_url }
      format.json { head :no_content }
    end
  end

  # GET /YIDS/.json

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_yid
      @yid = Yid.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def yid_params
      params.require(:yid).permit(:name, :email, :phone)
    end

    def is_dev
      if not Rails.env.development?
       redirect_to yids_path,
         flash: {error: 'You cannot fake login except in dev. Naughty.'}
      end

    end

    def is_current_user
      if not (current_user.id == @yid.id)
       redirect_to yids_path,
         flash: {error: 'You cannot change other Yids through web sites. Maybe try Chesed?'}
      end

    end
end
