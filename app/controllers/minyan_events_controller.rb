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
      errors << "You must be logged in before RSVP'ing"
      redirect_to 'new_yid'
    end
    
    @minyan = Minyan.find(params[:minyan_id])
    @minyan_event = @minyan.minyan_events.find_by_id(params[:minyan_event_id])

    @minyan_event.rsvps.create(yid: current_user)

    redirect_to minyan_path(@minyan)
  end

  private
    def minyan_event_params
      params.require(:minyan_event).permit(
        :date,
      )
    end
end
