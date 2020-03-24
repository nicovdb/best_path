class TripsController < ApplicationController
  def new
    @trip = Trip.new
  end

  def create
    @trip = Trip.create(user: current_user)
    redirect_to trip_path(@trip)
  end

  def show
    @trip = Trip.find(params[:id])
    @stop = Stop.new

    @markers = @trip.stops.map do |stop|
      {
        lat: stop.latitude,
        lng: stop.longitude,
        infoWindow: render_to_string(partial: "info_window", locals: { stop: stop })
      }
    end
  end

  def finished
    @trip = Trip.find(params[:id])
    @trip.update(finished: true)
    redirect_to trip_path(@trip)
  end
end
