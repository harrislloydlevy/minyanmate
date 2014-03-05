class EventsController < ApplicationController
  before_action :require_login
  before_action :confirm_owner
  skip_before_action :confirm_owner, only: [:toggle_attend, :confirm_attend, :cancel_attend, :my_events]

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

  # Confirm personal attendance, only used for submitted pages (nonjs)
  def confirm_attend
    @minyan = Minyan.find(params[:minyan_id])
    @event = @minyan.events.find_by_id(params[:event_id])
    add_attendee(@event, current_user)


    redirect_to minyan_path(@minyan)
  end

  # Toggle attendance at event using JS
  def toggle_attend
    @event = Event.find_by_id(params[:event_id])

    if @event.in_attendance(current_user)
      remove_attendee(@event, current_user)
    else
      add_attendee(@event, current_user)
    end

    respond_to do |format|
      format.js { }
    end
  end

  def rm_rsvp
    @event = Event.find(params[:event_id])
    @yid = Yid.find(params[:yid_id])

    @rsvp = remove_attendee(@event, @yid)

    respond_to do |format|
      # Update the whole event with the post RSVP js
      format.js {render "events/update"}
    end
  end

  def cancel_attend
    @minyan = Minyan.find(params[:minyan_id])
    @event = @minyan.events.find_by_id(params[:event_id])

    # Remove the attedance
    @rsvp = remove_attendee(@event, current_user.id)

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

    @yid = Yid.find(params[:yid_id])
    
    @rsvp = add_attendee(@event, @yid)

    respond_to do |format| 
      # JS format is for my minyans and calls the code to refresh the whole
      # RSVP block for the event using @event set above
      format.js {render "events/update"}
      format.html { redirect_to minyan_path(@event.minyan),
                    notice: 'RSVP Added' }
      format.json {render json: @rsvp, status: :created, location: @rsvp }
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
        add_attendee(@event, @yid)
        
        format.js { render partial: "minyans/popup_add_yid_success" }
      end
    end
  end

  def my_events
    # To find the events a person could be interested in we look over the next 2 weeks for all
    # events for Minyans they have either RSVP'd to at least one event in the previous two weeks
    # or next two weeks, and all minyans they are regulars at.
    #
    # This is a pretty compact page so we can grab a lot of events.
    @events = []

    days_ahead = 14
    days_look_behind = 14

    # First find all events for the next two weeks of the minyans we are a regulars at
    # NOTE: We don't use fancy active record queries here as we don't pre-emptively create
    # event records. They're only created on demand. So DB queries would be useless.
    current_user.minyans.each { |x| @events.concat(x.upcoming_period(days_ahead)) }

    # Next we find all the minyans we're RSVP'd for in the past 2 or next 2 weeks and add
    # their events in.
    # First we get all the Minyan IDs for RSVPS for us in that time period
    date_range = [Date.today() - days_look_behind .. Date.today() + days_ahead]
    minyan_ids = Event.joins(:minyan)
                      .joins(:rsvps)
                      .where("rsvps.yid_id" => current_user, :date => date_range)
                      .pluck(:minyan_id).uniq

    # Remove the minyans we regullarly attend anyway that we caught above.
    minyan_ids = minyan_ids - current_user.minyan_ids

    # Now add the events for all those minyans left that we attended or promised to attend
    # in the future but are not regulars at
    minyan_ids.each {
      |x| @events.concat(
        Minyan.find(x).upcoming_period(days_ahead)
      )
    }

    # Now we sort the events by date from most recent.
    @events.sort! { |a,b| a.date <=> b.date }

    # Now we have populated @events with all the events we want to show the user, time to render the page
    respond_to do |format|
      format.html
    end
  end

  private
    # Centrailised add and remove functions so that the logic for detecting making a minyan 
    # ca be added here. Note that the model itself takes care of sending the messages out
    # we jsut nee to detect it here so that we can add a notice.
    def add_attendee(event, yid)
      # Add the yid_id to the event
      event.rsvps.create(yid: yid)

      # Necessary as I get the created RSVP showing up twice for some reason
      event.rsvps.reload

      if event.num_rsvps == 10
        flash.now[:notice] ||= []
        flash.now[:notice] << "You made the minyan!"
      end
    end

    def remove_attendee(event, yid)
      rsvp = event.rsvps.find_by(yid: yid)
      event.rsvps.destroy(rsvp)

      if event.num_rsvps == 9
        flash.now[:error] ||= []
        flash.now[:error] << "Minyan cancelled :(."
      end
    end

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
