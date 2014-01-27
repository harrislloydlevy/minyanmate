class EventsController < ApplicationController
  before_action :require_login
  before_action :confirm_owner
  skip_before_action :confirm_owner, only: [:confirm_attend, :cancel_attend]

  def create
    @minyan = Minyan.find(params[:minyan_id])
    @event = @minyan.events.create(event_params)

    render 'minyans/show'
  end

  def destroy
    @minyan = Minyan.find(params[:minyan_id])
    @event = @minyan.events.find(params[:id])
    @event.destroy

    redirect_to minyan_path(@minyan)
  end

  def confirm_attend
    if not current_user
      redirect_to 'new_yid', alert: "You must be logged in to RSVP."
    end
    
    @minyan = Minyan.find(params[:minyan_id])
    @event = @minyan.events.find_by_id(params[:event_id])

    @event.yids << current_user

    redirect_to minyan_path(@minyan)
  end

  def rm_rsvp
    @event = Event.find(params[:event_id])
    Rsvp.delete_all(:event_id => @event.id, :yid_id => params[:yid_id])

    respond_to do |format|
      # Update the whole event with the post RSVP js
      format.js {render "events/update"}
    end
  end

  def cancel_attend
    if not current_user
      redirect_to 'new_yid', alert: "You must be logged in to RSVP."
    end
    
    @minyan = Minyan.find(params[:minyan_id])
    @event = @minyan.events.find_by_id(params[:event_id])

    # Remove the attedance
    @event.yids.delete(current_user)

    redirect_to minyan_path(@minyan)
  end

  def rsvp
    @event = Event.find(params[:event_id])
    @rsvp = @event.rsvps.new(yid_id: params[:yid_id])

    respond_to do |format| 
      if @rsvp.save
         format.js { } # Fallback to the events/rsvp.js.erb view
         format.html { redirect_to minyan_path(@event.minyan),
                       notice: 'RSVP Added' }
         format.json {render json: @rsvp, status: :created, location: @rsvp }
      else
         format.js { render "rsvp_error" } # Fallback to the events/rsvp_error.js.erb view
         format.html { redirect_to minyan_path(@event.minyan),
                       error: 'RSVP not added' }
         format.json {render json: @rsvp.errors, status: :unprocessable_entity }
      end
    end 
  end

  def star
    if isregular(current_user) then
    else
    end
  end

  private
    def event_params
      params.require(:event).permit(
        :date,
      )
    end

    def confirm_owner
      @minyan = Minyan.find(params[:minyan_id])
      if @minyan.owner != current_user
        redirect_to minyans_path,
          flash: {error: 'Not your Minyan to edit.'}
      end
    end
end
