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
        lng: stop.longitude
      }
    end
  end
end
