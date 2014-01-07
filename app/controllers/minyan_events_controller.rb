class MinyanEventsController < ApplicationController
  def create
    @minyan = Minyan.find(params[:minyan_id])
    @minyan_event = @minyan.minyan_events.create(minyan_event_params)

    render 'minyans/show'
  end

  def destroy
    @minyan = Minyan.find(params[:minyan_id])
    @minyan_event = @minyan.minyan_events.find(params[:id])
    @minyan_event.destroy

    redirect_to minyan_path(@minyan)
  end

  def confirm_attend
    if not current_user
      redirect_to 'new_yid', alert: "You must be logged in to RSVP."
    end
    
    @minyan = Minyan.find(params[:minyan_id])
    @minyan_event = @minyan.minyan_events.find_by_id(params[:minyan_event_id])

    @minyan_event.yids << current_user

    redirect_to minyan_path(@minyan)
  end

  def cancel_attend
    if not current_user
      redirect_to 'new_yid', alert: "You must be logged in to RSVP."
    end
    
    @minyan = Minyan.find(params[:minyan_id])
    @minyan_event = @minyan.minyan_events.find_by_id(params[:minyan_event_id])

    # Remove the attedance
    @minyan_event.yids.delete(current_user)

    redirect_to minyan_path(@minyan)
  end

  def rsvp
    @minyan_event = MinyanEvent.find(params[:minyan_event_id])
    @rsvp = @minyan_event.rsvps.new(yid_id: params[:yid_id])

    respond_to do |format| 
      if @rsvp.save
         format.js { } # Fallback to the minyan_events/rsvp.js.erb view
         format.html { redirect_to minyan_path(@minyan_event.minyan),
                       notice: 'RSVP Added' }
         format.json {render json: @rsvp, status: :created, location: @rsvp }
      else
         format.js { render "rsvp_error" } # Fallback to the minyan_events/rsvp_error.js.erb view
         format.html { redirect_to minyan_path(@minyan_event.minyan),
                       error: 'RSVP not added' }
         format.json {render json: @rsvp.errors, status: :unprocessable_entity }
      end
    end 
  end

  private
    def minyan_event_params
      params.require(:minyan_event).permit(
        :date,
      )
    end
end
