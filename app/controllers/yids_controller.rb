class YidsController < ApplicationController
  before_action :set_yid, only: [:show, :edit, :update, :destroy, :set_current_user]

  # Login as this user
  def set_current_user
    session[:current_user_id] = @yid.id
    respond_to do |format|
      format.html { redirect_to yids_url }
      format.json { head :no_content }
    end
  end

  # GET /yids
  # GET /yids.json
  def index
    @yids = Yid.all
  end

  # GET /yid_suggest
  # GET /yid_suggest.json
  def suggest
    already_attending = MinyanEvent.find(params[:minyan_event]).yid_ids
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

  # GET /yids/new
  def new
    @yid = Yid.new
  end

  # GET /yids/1/edit
  def edit
  end

  # POST /yids
  # POST /yids.json
  def create
    @yid = Yid.new(yid_params)

    respond_to do |format|
      if @yid.save
        format.html { redirect_to @yid, notice: 'Yid was successfully created.' }
        format.json { render action: 'show', status: :created, location: @yid }
      else
        format.html { render action: 'new' }
        format.json { render json: @yid.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /yids/1
  # PATCH/PUT /yids/1.json
  def update
    respond_to do |format|
      if @yid.update(yid_params)
        format.html { redirect_to @yid, notice: 'Yid was successfully updated.' }
        format.json { head :no_content }
      else
        format.html { render action: 'edit' }
        format.json { render json: @yid.errors, status: :unprocessable_entity }
      end
    end
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
end
