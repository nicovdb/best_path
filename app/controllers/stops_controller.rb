class StopsController < ApplicationController
  def create
    @stop = Stop.new(stop_params)
    @stop.save
    redirect_to trip_path(@stop.trip)
  end

  def destroy
    @stop = Stop.find(params[:id])
    @stop.destroy
    redirect_to trip_path(@stop.trip)
  end

  private

  def stop_params
    params.require(:stop).permit(:trip_id, :address)
  end
end
