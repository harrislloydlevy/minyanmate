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
    @minyan = Minyan.find(params[:minyan_id])
    @event = @minyan.events.find_by_id(params[:event_id])

    # Remove the attedance
    @event.yids.delete(current_user)

    redirect_to minyan_path(@minyan)
  end

  def rsvp
    @event = Event.find(params[:event_id])

    if params[:yid_id] == ""
      # If there's not yid_id then the user has hit "add" without selecting a user
      # so we should put up a pop-up to add a new yid. This is accomplished
      # by returning some JS to activate the add_yid modal
      render "events/show_add_modal", format: :js
      return
    end

    @rsvp = @event.rsvps.new(yid_id: params["yidId" + @event.id.to_s])

    # No idea why, but need to refresh teh events RSVP list here or the RSVP we just added
    # turns up twice.
    # PENDING: Work out why
    ap @event.rsvps
    respond_to do |format| 
      if @rsvp.save
        # JS format is for my minyans and calls the code to refresh the whole
        # RSVP block for the event using @event set above
        format.js {render "events/update"}
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

  def new_yid_to_event
    # The user has already been authenticated as the owner, so no worries there.
    # Steps will be:
    # 1. Create the new user
    # 1.1 if this fails re-render the pop-up with any validation messages
    # 2. Add him to this event
    # 2.1 If this fails return to main page and show error on header
    # 3. Send of JS to close popover and update this event.
    @event = Event.find(params[:event_id])

    @yid = Yid.new()
    @yid.name = params[:yid][:name]
    @yid.email = params[:yid][:email]
    @yid.phone = params[:yid][:phone]

    respond_to do |format| 
      if not @yid.save
        format.js { render partial: "minyans/popup_add_yid_error" }
      else
        # Now add the yid to the event
        @event.yids << @yid
        @event.save!

        # Force a reload of the event as the last added rsvps was turning up twice for some reasons
        @event.rsvps.reload
        @event.yids.reload
        format.js { render partial: "minyans/popup_add_yid_success" }
      end
    end
  end


  private
    def event_params
      params.require(:event).permit(
        :date,
      )
    end

    def confirm_owner
      if params[:minyan_id]
        @minyan = Minyan.find(params[:minyan_id])
      else
        @minyan = (Event.find(params[:event_id])).minyan
      end

      if @minyan.owner != current_user
        redirect_to minyans_path,
          flash: {error: 'Not your Minyan to edit.'}
      end
    end
end
